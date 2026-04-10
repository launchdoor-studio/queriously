use parking_lot::Mutex;
use serde::Deserialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::time::Duration;

/// Runtime state for the Python sidecar: the spawned child process and the
/// HTTP port it bound to (discovered via the stdout handshake).
pub struct SidecarState {
    pub port: Option<u16>,
    pub child: Option<Child>,
}

pub type SidecarHandle = Arc<Mutex<SidecarState>>;

#[derive(Debug, Deserialize)]
struct Handshake {
    status: String,
    port: u16,
}

/// Walk candidate directories to find the repo root that contains `python/main.py`.
fn find_repo_root() -> Option<std::path::PathBuf> {
    let has_python = |dir: &std::path::Path| dir.join("python").join("main.py").exists();

    // 1. Relative to the running executable.
    //    Bundled: Queriously.app/Contents/MacOS/queriously → ../../../../ is repo root
    //    Release binary: target/release/queriously → ../../../ is repo root
    if let Ok(exe) = std::env::current_exe().and_then(std::fs::canonicalize) {
        let mut dir = exe.as_path();
        // Walk up to 10 levels from the binary to find the repo root.
        // Bundled .app is 9 levels deep: MacOS/Contents/App/macos/bundle/release/target/src-tauri/repo
        for _ in 0..10 {
            if let Some(parent) = dir.parent() {
                dir = parent;
                if has_python(dir) {
                    return Some(dir.to_path_buf());
                }
            } else {
                break;
            }
        }
    }

    // 2. Check cwd (running from repo root).
    if let Ok(cwd) = std::env::current_dir() {
        if has_python(&cwd) {
            return Some(cwd);
        }
        // 3. Check parent of cwd (tauri dev runs from src-tauri/).
        let parent = cwd.join("..");
        if has_python(&parent) {
            return std::fs::canonicalize(parent).ok();
        }
    }

    None
}

/// Locate the bundled Python sidecar entry point. For local dev we fall back
/// to the repo's `python/main.py` invoked via the system Python. Phase 4 will
/// swap this for a PyInstaller-bundled binary (OQ-02 in the spec).
fn sidecar_command() -> Option<Command> {
    // Find the repo root containing the `python/` package directory.
    // We check multiple locations:
    //   1. Relative to the executable (works for bundled .app and release binary)
    //   2. cwd (works when run from repo root)
    //   3. cwd/.. (tauri dev runs from src-tauri/)
    let repo_root = find_repo_root()?;

    let python_dir = repo_root.join("python");

    // Prefer venv Python if it exists, then QUERIOUSLY_PYTHON env, then system python3.
    let venv_python = python_dir.join(".venv").join("bin").join("python3");
    let python_bin = if venv_python.exists() {
        venv_python.to_string_lossy().into_owned()
    } else {
        std::env::var("QUERIOUSLY_PYTHON").unwrap_or_else(|_| "python3".into())
    };

    eprintln!("[sidecar] using python: {python_bin}");
    eprintln!("[sidecar] repo root: {}", repo_root.display());

    // Run as `python -m python.main` from the repo root so relative imports work.
    let mut cmd = Command::new(python_bin);
    cmd.args(["-m", "python.main"]);
    cmd.current_dir(&repo_root);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    Some(cmd)
}

/// Spawn the sidecar and block until it announces its port (or we give up).
/// Returns a handle the Tauri state layer can hold onto for the app lifetime.
pub fn spawn() -> SidecarHandle {
    let state = Arc::new(Mutex::new(SidecarState {
        port: None,
        child: None,
    }));

    let Some(mut cmd) = sidecar_command() else {
        eprintln!("[sidecar] entry point not found; AI features will be disabled");
        return state;
    };

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[sidecar] failed to spawn python sidecar: {e}");
            return state;
        }
    };

    // Read the first stdout line in a worker thread so we don't block startup
    // forever if the sidecar never comes up.
    let stdout = child.stdout.take().expect("stdout piped");
    let state_for_reader = state.clone();
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        if reader.read_line(&mut line).is_ok() {
            if let Ok(hs) = serde_json::from_str::<Handshake>(line.trim()) {
                if hs.status == "ready" {
                    state_for_reader.lock().port = Some(hs.port);
                    eprintln!("[sidecar] ready on port {}", hs.port);
                }
            } else {
                eprintln!("[sidecar] unexpected handshake: {}", line.trim());
            }
        }
        // Drain remaining stdout so the pipe buffer never fills up.
        for l in reader.lines().flatten() {
            eprintln!("[sidecar] {l}");
        }
    });

    state.lock().child = Some(child);

    // Grace period so the handshake can land before the UI asks for it.
    // The sidecar may take a few seconds to start (loading ML libraries).
    std::thread::sleep(Duration::from_secs(3));
    state
}

/// Return the base URL of the sidecar HTTP server, or `None` if it isn't ready.
pub fn base_url(handle: &SidecarHandle) -> Option<String> {
    handle.lock().port.map(|p| format!("http://127.0.0.1:{p}"))
}

/// Best-effort cleanup on app shutdown.
pub fn shutdown(handle: &SidecarHandle) {
    if let Some(mut child) = handle.lock().child.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

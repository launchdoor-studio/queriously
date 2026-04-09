use serde::Serialize;
use tauri::State;

use crate::sidecar::{base_url, SidecarHandle};

#[derive(Debug, Serialize)]
pub struct SidecarStatus {
    pub ready: bool,
    pub port: Option<u16>,
    pub health: Option<String>,
}

/// Report whether the Python sidecar is up, and include the raw /health body
/// if it responds. Used by the onboarding + status bar to show AI availability.
#[tauri::command]
pub async fn sidecar_status(state: State<'_, SidecarHandle>) -> Result<SidecarStatus, String> {
    let Some(url) = base_url(&state) else {
        return Ok(SidecarStatus {
            ready: false,
            port: None,
            health: None,
        });
    };
    let port = state.lock().port;

    let health = reqwest::Client::new()
        .get(format!("{url}/health"))
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
        .ok();

    match health {
        Some(resp) if resp.status().is_success() => {
            let body = resp.text().await.unwrap_or_default();
            Ok(SidecarStatus {
                ready: true,
                port,
                health: Some(body),
            })
        }
        _ => Ok(SidecarStatus {
            ready: false,
            port,
            health: None,
        }),
    }
}

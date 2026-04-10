mod commands;
mod db;
mod hashing;
mod paths;
mod sidecar;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = db::open().expect("failed to open database");
    let sidecar_handle = sidecar::spawn();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { db })
        .manage(sidecar_handle.clone())
        .on_window_event({
            let handle = sidecar_handle.clone();
            move |_win, event| {
                if let tauri::WindowEvent::Destroyed = event {
                    sidecar::shutdown(&handle);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::pdf::open_pdf,
            commands::pdf::get_library,
            commands::pdf::delete_paper,
            commands::ai::ingest_paper,
            commands::ai::ask_question,
            commands::ai::generate_marginalia,
            commands::ai::get_marginalia,
            commands::ai::summarize_paper,
            commands::annotations::update_reading_progress,
            commands::annotations::get_reading_progress,
            commands::annotations::save_annotation,
            commands::annotations::get_annotations,
            commands::annotations::delete_annotation,
            commands::sidecar_cmd::sidecar_status,
            commands::config::update_llm_config,
            commands::config::check_ollama,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

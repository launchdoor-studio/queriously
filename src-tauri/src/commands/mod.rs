pub mod ai;
pub mod pdf;
pub mod sidecar_cmd;

use crate::db::DbHandle;

/// Shared application state made available to every Tauri command through
/// `tauri::State`.
pub struct AppState {
    pub db: DbHandle,
}

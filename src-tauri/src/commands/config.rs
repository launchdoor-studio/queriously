use serde::{Deserialize, Serialize};
use tauri::State;

use crate::sidecar::{base_url, SidecarHandle};

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmConfig {
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub running: bool,
    pub models: Vec<String>,
}

/// Push LLM config to the Python sidecar so it takes effect at runtime.
#[tauri::command]
pub async fn update_llm_config(
    config: LlmConfig,
    state: State<'_, SidecarHandle>,
) -> Result<(), String> {
    let Some(url) = base_url(&state) else {
        return Err("sidecar not ready".into());
    };
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{url}/config/llm"))
        .json(&config)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("config update failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("config update returned {}", resp.status()));
    }
    Ok(())
}

/// Check if Ollama is running locally (via the sidecar's detection endpoint).
#[tauri::command]
pub async fn check_ollama(state: State<'_, SidecarHandle>) -> Result<OllamaStatus, String> {
    let Some(url) = base_url(&state) else {
        return Ok(OllamaStatus {
            running: false,
            models: vec![],
        });
    };
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{url}/ollama/status"))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("ollama check failed: {e}"))?;
    let status: OllamaStatus = resp
        .json()
        .await
        .map_err(|e| format!("parse ollama status: {e}"))?;
    Ok(status)
}

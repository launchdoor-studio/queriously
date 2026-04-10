use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::commands::AppState;
use crate::sidecar::{base_url, SidecarHandle};

// ---------- Ingest ----------

#[derive(Debug, Serialize)]
struct IngestBody {
    paper_id: String,
    file_path: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PaperMetadata {
    pub title: Option<String>,
    pub authors: Option<String>,
    pub r#abstract: Option<String>,
    pub year: Option<i64>,
    pub page_count: i64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct IngestResult {
    pub paper_id: String,
    pub chunk_count: i64,
    pub equation_count: i64,
    pub citation_count: i64,
    pub metadata: PaperMetadata,
}

/// Proxy to the Python sidecar's /ingest endpoint. After ingestion succeeds
/// we update the papers table with the extracted metadata so the library
/// view can show titles/authors/page counts even after the sidecar restarts.
#[tauri::command]
pub async fn ingest_paper(
    paper_id: String,
    file_path: String,
    app: AppHandle,
    sidecar: State<'_, SidecarHandle>,
    db_state: State<'_, AppState>,
) -> Result<IngestResult, String> {
    let url = base_url(&sidecar).ok_or("sidecar not ready")?;

    let _ = app.emit("ingest:progress", serde_json::json!({
        "paper_id": &paper_id, "step": "starting", "percent": 0
    }));

    let resp = reqwest::Client::new()
        .post(format!("{url}/ingest"))
        .json(&IngestBody {
            paper_id: paper_id.clone(),
            file_path,
        })
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| format!("ingest request failed: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("ingest returned error: {body}"));
    }

    let result: IngestResult = resp.json().await.map_err(|e| e.to_string())?;

    // Persist metadata back into SQLite so the library shows it even offline.
    {
        let db = db_state.db.lock();
        let _ = db.execute(
            "UPDATE papers SET title = COALESCE(?2, title),
                               authors = COALESCE(?3, authors),
                               abstract = COALESCE(?4, abstract),
                               year = COALESCE(?5, year),
                               page_count = COALESCE(?6, page_count),
                               is_indexed = 1
              WHERE id = ?1",
            rusqlite::params![
                &result.paper_id,
                &result.metadata.title,
                &result.metadata.authors,
                &result.metadata.r#abstract,
                &result.metadata.year,
                &result.metadata.page_count,
            ],
        );
    }

    let _ = app.emit("ingest:complete", serde_json::json!({
        "paper_id": &paper_id,
        "chunk_count": result.chunk_count,
    }));

    Ok(result)
}

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::AppState;

// ---------- Reading Progress ----------

#[tauri::command]
pub fn update_reading_progress(
    paper_id: String,
    page: i64,
    delta_secs: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let db = state.db.lock();
    db.execute(
        "INSERT INTO reading_progress (paper_id, page_number, time_spent_secs, last_visited)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(paper_id, page_number) DO UPDATE SET
             time_spent_secs = time_spent_secs + excluded.time_spent_secs,
             last_visited = excluded.last_visited",
        rusqlite::params![&paper_id, page, delta_secs, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageProgress {
    pub page_number: i64,
    pub time_spent_secs: i64,
}

#[tauri::command]
pub fn get_reading_progress(
    paper_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<PageProgress>, String> {
    let db = state.db.lock();
    let mut stmt = db
        .prepare(
            "SELECT page_number, time_spent_secs
               FROM reading_progress
              WHERE paper_id = ?1
              ORDER BY page_number",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&paper_id], |row| {
            Ok(PageProgress {
                page_number: row.get(0)?,
                time_spent_secs: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

// ---------- Annotations ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Annotation {
    pub id: String,
    pub paper_id: String,
    pub session_id: Option<String>,
    pub page: i64,
    pub coords: String,
    pub r#type: String,
    pub color: Option<String>,
    pub selected_text: Option<String>,
    pub note_text: Option<String>,
    pub created_at: i64,
    pub updated_at: Option<i64>,
}

#[tauri::command]
pub fn save_annotation(annotation: Annotation, state: State<'_, AppState>) -> Result<Annotation, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let db = state.db.lock();
    db.execute(
        "INSERT INTO annotations (id, paper_id, session_id, page, coords, type, color, selected_text, note_text, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)
         ON CONFLICT(id) DO UPDATE SET
             note_text = excluded.note_text,
             color = excluded.color,
             updated_at = excluded.updated_at",
        rusqlite::params![
            &annotation.id,
            &annotation.paper_id,
            &annotation.session_id,
            &annotation.page,
            &annotation.coords,
            &annotation.r#type,
            &annotation.color,
            &annotation.selected_text,
            &annotation.note_text,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(annotation)
}

#[tauri::command]
pub fn get_annotations(paper_id: String, state: State<'_, AppState>) -> Result<Vec<Annotation>, String> {
    let db = state.db.lock();
    let mut stmt = db
        .prepare(
            "SELECT id, paper_id, session_id, page, coords, type, color,
                    selected_text, note_text, created_at, updated_at
               FROM annotations
              WHERE paper_id = ?1
              ORDER BY page, created_at",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&paper_id], |row| {
            Ok(Annotation {
                id: row.get(0)?,
                paper_id: row.get(1)?,
                session_id: row.get(2)?,
                page: row.get(3)?,
                coords: row.get(4)?,
                r#type: row.get(5)?,
                color: row.get(6)?,
                selected_text: row.get(7)?,
                note_text: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn delete_annotation(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock();
    db.execute("DELETE FROM annotations WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

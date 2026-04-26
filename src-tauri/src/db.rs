use parking_lot::Mutex;
use rusqlite::Connection;
use std::sync::Arc;

use crate::paths;

pub type DbHandle = Arc<Mutex<Connection>>;

/// Open (or create) the SQLite database and run migrations.
pub fn open() -> anyhow::Result<DbHandle> {
    paths::ensure_dirs()?;
    let conn = Connection::open(paths::db_file())?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )?;
    migrate(&conn)?;
    Ok(Arc::new(Mutex::new(conn)))
}

fn migrate(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(SCHEMA_V1)?;
    add_column_if_missing(conn, "chat_messages", "counterpoint", "TEXT")?;
    add_column_if_missing(conn, "chat_messages", "followup_question", "TEXT")?;
    add_column_if_missing(conn, "chat_messages", "margin_note", "TEXT")?;
    add_column_if_missing(conn, "chat_messages", "evidence", "TEXT")?;
    Ok(())
}

fn add_column_if_missing(
    conn: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> anyhow::Result<()> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let exists = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?
        .iter()
        .any(|name| name == column);

    if !exists {
        conn.execute(
            &format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
            [],
        )?;
    }

    Ok(())
}

/// Full schema per spec §9. Using `IF NOT EXISTS` so migration is idempotent
/// on every launch. Bumping the schema will require a versioned migration
/// table — deferred until Phase 2.
const SCHEMA_V1: &str = r#"
CREATE TABLE IF NOT EXISTS papers (
    id              TEXT PRIMARY KEY,
    file_path       TEXT NOT NULL,
    title           TEXT,
    authors         TEXT,
    abstract        TEXT,
    year            INTEGER,
    venue           TEXT,
    doi             TEXT,
    arxiv_id        TEXT,
    page_count      INTEGER,
    date_added      INTEGER NOT NULL,
    last_opened     INTEGER,
    is_indexed      INTEGER DEFAULT 0,
    index_version   INTEGER DEFAULT 0,
    marginalia_done INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reading_progress (
    paper_id        TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    page_number     INTEGER NOT NULL,
    time_spent_secs INTEGER DEFAULT 0,
    last_visited    INTEGER,
    PRIMARY KEY (paper_id, page_number)
);

CREATE TABLE IF NOT EXISTS sessions (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    research_question TEXT NOT NULL,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER,
    synthesis_text    TEXT,
    synthesis_stale   INTEGER DEFAULT 0,
    synthesis_at      INTEGER
);

CREATE TABLE IF NOT EXISTS session_papers (
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    paper_id   TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    added_at   INTEGER NOT NULL,
    PRIMARY KEY (session_id, paper_id)
);

CREATE TABLE IF NOT EXISTS annotations (
    id            TEXT PRIMARY KEY,
    paper_id      TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    page          INTEGER NOT NULL,
    coords        TEXT NOT NULL,
    type          TEXT NOT NULL,
    color         TEXT,
    selected_text TEXT,
    note_text     TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER
);

CREATE TABLE IF NOT EXISTS marginalia (
    id              TEXT PRIMARY KEY,
    paper_id        TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    page            INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,
    type            TEXT NOT NULL,
    note_text       TEXT NOT NULL,
    ref_page        INTEGER,
    is_edited       INTEGER DEFAULT 0,
    is_deleted      INTEGER DEFAULT 0,
    edited_text     TEXT,
    generated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id                  TEXT PRIMARY KEY,
    paper_id            TEXT REFERENCES papers(id) ON DELETE CASCADE,
    research_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    created_at          INTEGER NOT NULL,
    is_multi_paper      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              TEXT PRIMARY KEY,
    chat_session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    sources         TEXT,
    evidence        TEXT,
    reading_mode    TEXT,
    selection_text  TEXT,
    confidence      TEXT,
    counterpoint    TEXT,
    followup_question TEXT,
    margin_note     TEXT,
    created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS summaries (
    id         TEXT PRIMARY KEY,
    paper_id   TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    mode       TEXT NOT NULL,
    scope      TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    is_cached  INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_papers_last_opened ON papers(last_opened DESC);
CREATE INDEX IF NOT EXISTS idx_annotations_paper ON annotations(paper_id, page);
CREATE INDEX IF NOT EXISTS idx_marginalia_paper ON marginalia(paper_id, page);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(chat_session_id, created_at);
"#;

#[cfg(test)]
mod tests {
    use super::*;

    fn migrated_db() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch("PRAGMA foreign_keys = ON;")
            .expect("foreign keys on");
        migrate(&conn).expect("migration succeeds");
        conn
    }

    #[test]
    fn migration_creates_chat_persistence_columns() {
        let conn = migrated_db();
        migrate(&conn).expect("migration is idempotent");

        let mut stmt = conn
            .prepare("PRAGMA table_info(chat_messages)")
            .expect("table info");
        let columns = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .expect("columns")
            .collect::<Result<Vec<_>, _>>()
            .expect("collect columns");

        for expected in [
            "sources",
            "reading_mode",
            "selection_text",
            "confidence",
            "evidence",
            "counterpoint",
            "followup_question",
            "margin_note",
        ] {
            assert!(
                columns.iter().any(|c| c == expected),
                "missing chat column {expected}"
            );
        }
    }

    #[test]
    fn smoke_persists_library_annotation_progress_and_session_rows() {
        let conn = migrated_db();

        conn.execute(
            "INSERT INTO papers
                (id, file_path, title, date_added, last_opened, is_indexed)
             VALUES ('paper-1', '/tmp/paper.pdf', 'Paper One', 10, 11, 1)",
            [],
        )
        .expect("insert paper");
        conn.execute(
            "INSERT INTO reading_progress
                (paper_id, page_number, time_spent_secs, last_visited)
             VALUES ('paper-1', 3, 42, 12)",
            [],
        )
        .expect("insert reading progress");
        conn.execute(
            "INSERT INTO annotations
                (id, paper_id, page, coords, type, color, selected_text, note_text, created_at)
             VALUES
                ('ann-1', 'paper-1', 3, '[[0.1,0.2,0.3,0.4]]',
                 'highlight', '#FEF08A', 'selected', NULL, 13)",
            [],
        )
        .expect("insert annotation");
        conn.execute(
            "INSERT INTO sessions
                (id, name, research_question, created_at, updated_at)
             VALUES ('session-1', 'Latency review', 'Which design wins?', 14, 14)",
            [],
        )
        .expect("insert session");
        conn.execute(
            "INSERT INTO session_papers (session_id, paper_id, added_at)
             VALUES ('session-1', 'paper-1', 15)",
            [],
        )
        .expect("link paper to session");

        let paper_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM papers WHERE id = 'paper-1'",
                [],
                |row| row.get(0),
            )
            .expect("paper count");
        let annotation_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM annotations WHERE paper_id = 'paper-1'",
                [],
                |row| row.get(0),
            )
            .expect("annotation count");
        let session_paper_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM session_papers WHERE session_id = 'session-1'",
                [],
                |row| row.get(0),
            )
            .expect("session paper count");
        let reading_secs: i64 = conn
            .query_row(
                "SELECT time_spent_secs FROM reading_progress
                  WHERE paper_id = 'paper-1' AND page_number = 3",
                [],
                |row| row.get(0),
            )
            .expect("reading progress");

        assert_eq!(paper_count, 1);
        assert_eq!(annotation_count, 1);
        assert_eq!(session_paper_count, 1);
        assert_eq!(reading_secs, 42);
    }

    #[test]
    fn smoke_persists_chat_history_with_sources_and_mode_extras() {
        let conn = migrated_db();

        conn.execute(
            "INSERT INTO papers (id, file_path, title, date_added)
             VALUES ('paper-1', '/tmp/paper.pdf', 'Paper One', 10)",
            [],
        )
        .expect("insert paper");
        conn.execute(
            "INSERT INTO chat_sessions (id, paper_id, created_at, is_multi_paper)
             VALUES ('chat-1', 'paper-1', 11, 0)",
            [],
        )
        .expect("insert chat session");
        conn.execute(
            "INSERT INTO chat_messages
                (id, chat_session_id, role, content, sources, evidence,
                 reading_mode, selection_text, confidence, counterpoint,
                 followup_question, margin_note, created_at)
             VALUES
                ('msg-user', 'chat-1', 'user', 'What is the claim?', NULL,
                 NULL, 'challenge', 'selected passage', NULL, NULL, NULL, NULL, 12),
                ('msg-assistant', 'chat-1', 'assistant', 'The claim is grounded.',
                 '[{\"page\":3,\"score\":0.91}]',
                 '{\"level\":\"strong\",\"label\":\"Well sourced\",\"answerable\":true}',
                 'challenge', NULL, 'high',
                 'The paper hedges this result.', NULL, NULL, 13)",
            [],
        )
        .expect("insert chat messages");

        let restored: Vec<(
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
        )> = {
            let mut stmt = conn
                .prepare(
                    "SELECT role, content, sources, evidence, counterpoint
                       FROM chat_messages
                      WHERE chat_session_id = 'chat-1'
                      ORDER BY created_at",
                )
                .expect("prepare chat query");
            stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                ))
            })
            .expect("query chat")
            .collect::<Result<Vec<_>, _>>()
            .expect("collect chat")
        };

        assert_eq!(restored.len(), 2);
        assert_eq!(restored[0].0, "user");
        assert_eq!(restored[1].0, "assistant");
        assert!(restored[1]
            .2
            .as_deref()
            .unwrap_or("")
            .contains("\"page\":3"));
        assert!(restored[1]
            .3
            .as_deref()
            .unwrap_or("")
            .contains("Well sourced"));
        assert_eq!(
            restored[1].4.as_deref(),
            Some("The paper hedges this result.")
        );
    }
}

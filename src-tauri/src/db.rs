use rusqlite::{Connection, Result};
use std::path::PathBuf;

fn db_path() -> PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.kurai.app");
    base.join("kurai.db")
}

pub fn init() -> Result<Connection> {
    let path = db_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(&path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    migrate(&conn)?;
    Ok(conn)
}

/// Open a second connection to the same DB.
/// Used by marathon engine to avoid locking the main Mutex<Connection>.
/// WAL mode allows concurrent readers + one writer.
pub fn open() -> Result<Connection> {
    let path = db_path();
    let conn = Connection::open(&path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
            key         TEXT PRIMARY KEY,
            value       TEXT NOT NULL,
            updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS watch_history (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            anime_id     INTEGER NOT NULL,
            anime_title  TEXT NOT NULL,
            season_num   INTEGER NOT NULL DEFAULT 1,
            episode_num  INTEGER NOT NULL,
            series_id    INTEGER,
            duration_sec INTEGER NOT NULL,
            watched_sec  INTEGER NOT NULL,
            is_marathon  INTEGER NOT NULL DEFAULT 0,
            watched_at   INTEGER NOT NULL DEFAULT (unixepoch())
        );
        CREATE INDEX IF NOT EXISTS idx_wh_anime ON watch_history(anime_id);
        CREATE INDEX IF NOT EXISTS idx_wh_date  ON watch_history(watched_at);

        CREATE TABLE IF NOT EXISTS marathon_queue (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            anime_id        INTEGER NOT NULL,
            anime_title     TEXT NOT NULL,
            total_episodes  INTEGER NOT NULL,
            start_ep        INTEGER NOT NULL DEFAULT 1,
            end_ep          INTEGER,
            current_ep      INTEGER NOT NULL DEFAULT 1,
            current_season  INTEGER NOT NULL DEFAULT 1,
            status          TEXT NOT NULL DEFAULT 'queued'
                            CHECK(status IN ('queued','active','paused','done','error')),
            position        INTEGER NOT NULL,
            farmed_count    INTEGER NOT NULL DEFAULT 0,
            error_message   TEXT,
            added_at        INTEGER NOT NULL DEFAULT (unixepoch()),
            started_at      INTEGER,
            completed_at    INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_mq_status   ON marathon_queue(status);
        CREATE INDEX IF NOT EXISTS idx_mq_position ON marathon_queue(position);

        CREATE TABLE IF NOT EXISTS marathon_sessions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at      INTEGER NOT NULL DEFAULT (unixepoch()),
            ended_at        INTEGER,
            total_episodes  INTEGER NOT NULL DEFAULT 0,
            total_seconds   INTEGER NOT NULL DEFAULT 0,
            status          TEXT NOT NULL DEFAULT 'running'
                            CHECK(status IN ('running','completed','stopped','error'))
        );

        CREATE TABLE IF NOT EXISTS anime_cache (
            anime_id    INTEGER PRIMARY KEY,
            data        TEXT NOT NULL,
            thumb_id    TEXT,
            cached_at   INTEGER NOT NULL DEFAULT (unixepoch()),
            ttl_sec     INTEGER NOT NULL DEFAULT 3600
        );

        CREATE TABLE IF NOT EXISTS marathon_watched (
            anime_id      INTEGER PRIMARY KEY,
            farmed_at     INTEGER NOT NULL DEFAULT (unixepoch()),
            episode_count INTEGER NOT NULL DEFAULT 0
        );
        ",
    )?;
    Ok(())
}
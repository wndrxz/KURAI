use crate::animix::types::QueueItem;
use rusqlite::Connection;

// ═══════════════════════════════════════
// Queue CRUD (existing from Step 1)
// ═══════════════════════════════════════

pub fn get_all(conn: &Connection) -> Result<Vec<QueueItem>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, anime_id, anime_title, total_episodes, start_ep, end_ep,
                    current_ep, current_season, status, position, farmed_count
             FROM marathon_queue ORDER BY position ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            Ok(QueueItem {
                id: row.get(0)?,
                anime_id: row.get(1)?,
                anime_title: row.get(2)?,
                total_episodes: row.get(3)?,
                start_ep: row.get(4)?,
                end_ep: row.get(5)?,
                current_ep: row.get(6)?,
                current_season: row.get(7)?,
                status: row.get(8)?,
                position: row.get(9)?,
                farmed_count: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

pub fn add(
    conn: &Connection,
    anime_id: u64,
    anime_title: &str,
    total_episodes: u32,
    start_ep: u32,
    end_ep: Option<u32>,
) -> Result<(), String> {
    let next_pos: u32 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM marathon_queue",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO marathon_queue (anime_id, anime_title, total_episodes, start_ep, end_ep, current_ep, position)
         VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?6)",
        rusqlite::params![anime_id, anime_title, total_episodes, start_ep, end_ep, next_pos],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn remove(conn: &Connection, id: u64) -> Result<(), String> {
    let removed_pos: u32 = conn
        .query_row(
            "SELECT position FROM marathon_queue WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Item not found: {}", e))?;

    conn.execute("DELETE FROM marathon_queue WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE marathon_queue SET position = position - 1 WHERE position > ?1",
        [removed_pos],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn reorder(conn: &Connection, id: u64, new_position: u32) -> Result<(), String> {
    let old_pos: u32 = conn
        .query_row(
            "SELECT position FROM marathon_queue WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Item not found: {}", e))?;

    if old_pos == new_position {
        return Ok(());
    }

    if new_position < old_pos {
        conn.execute(
            "UPDATE marathon_queue SET position = position + 1
             WHERE position >= ?1 AND position < ?2 AND id != ?3",
            rusqlite::params![new_position, old_pos, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE marathon_queue SET position = position - 1
             WHERE position > ?1 AND position <= ?2 AND id != ?3",
            rusqlite::params![old_pos, new_position, id],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "UPDATE marathon_queue SET position = ?1 WHERE id = ?2",
        rusqlite::params![new_position, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ═══════════════════════════════════════
// Queue Status Management
// ═══════════════════════════════════════

/// Get the next item to process.
/// Priority: 'active' first (resumed from pause), then 'queued' by position.
pub fn get_next_pending(conn: &Connection) -> Result<Option<QueueItem>, String> {
    let result = conn.query_row(
        "SELECT id, anime_id, anime_title, total_episodes, start_ep, end_ep,
                current_ep, current_season, status, position, farmed_count
         FROM marathon_queue
         WHERE status IN ('active', 'queued')
         ORDER BY
            CASE status WHEN 'active' THEN 0 ELSE 1 END,
            position ASC
         LIMIT 1",
        [],
        |row| {
            Ok(QueueItem {
                id: row.get(0)?,
                anime_id: row.get(1)?,
                anime_title: row.get(2)?,
                total_episodes: row.get(3)?,
                start_ep: row.get(4)?,
                end_ep: row.get(5)?,
                current_ep: row.get(6)?,
                current_season: row.get(7)?,
                status: row.get(8)?,
                position: row.get(9)?,
                farmed_count: row.get(10)?,
            })
        },
    );

    match result {
        Ok(item) => Ok(Some(item)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn mark_active(conn: &Connection, id: u64) -> Result<(), String> {
    conn.execute(
        "UPDATE marathon_queue SET status = 'active', started_at = COALESCE(started_at, unixepoch()) WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn mark_done(conn: &Connection, id: u64) -> Result<(), String> {
    conn.execute(
        "UPDATE marathon_queue SET status = 'done', completed_at = unixepoch() WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn mark_error(conn: &Connection, id: u64, message: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE marathon_queue SET status = 'error', error_message = ?2 WHERE id = ?1",
        rusqlite::params![id, message],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Mark item as skipped (distinct from 'paused' — won't be auto-resumed).
/// Uses 'paused' status but sets error_message = 'skipped' to distinguish.
pub fn mark_skipped(conn: &Connection, id: u64) -> Result<(), String> {
    conn.execute(
        "UPDATE marathon_queue SET status = 'paused', error_message = 'skipped' WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_progress(
    conn: &Connection,
    id: u64,
    current_ep: u32,
    current_season: u32,
    farmed_count: u32,
) -> Result<(), String> {
    conn.execute(
        "UPDATE marathon_queue
         SET current_ep = ?2, current_season = ?3, farmed_count = ?4
         WHERE id = ?1",
        rusqlite::params![id, current_ep, current_season, farmed_count],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn count_remaining(conn: &Connection) -> Result<u32, String> {
    conn.query_row(
        "SELECT COUNT(*) FROM marathon_queue WHERE status IN ('queued', 'active')",
        [],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

// ═══════════════════════════════════════
// Session Management
// ═══════════════════════════════════════

pub fn create_session(conn: &Connection) -> Result<u64, String> {
    conn.execute(
        "INSERT INTO marathon_sessions (started_at, status) VALUES (unixepoch(), 'running')",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid() as u64)
}

pub fn update_session(
    conn: &Connection,
    session_id: u64,
    total_episodes: u32,
    total_seconds: u64,
) -> Result<(), String> {
    conn.execute(
        "UPDATE marathon_sessions SET total_episodes = ?2, total_seconds = ?3 WHERE id = ?1",
        rusqlite::params![session_id, total_episodes, total_seconds],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn end_session(
    conn: &Connection,
    session_id: u64,
    status: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE marathon_sessions SET ended_at = unixepoch(), status = ?2 WHERE id = ?1",
        rusqlite::params![session_id, status],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ═══════════════════════════════════════
// Watch History Recording
// ═══════════════════════════════════════

pub fn record_watch(
    conn: &Connection,
    anime_id: u64,
    anime_title: &str,
    season: u32,
    episode: u32,
    series_id: u64,
    duration_sec: u64,
    watched_sec: u64,
    is_marathon: bool,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO watch_history
            (anime_id, anime_title, season_num, episode_num, series_id,
             duration_sec, watched_sec, is_marathon)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            anime_id,
            anime_title,
            season,
            episode,
            series_id,
            duration_sec,
            watched_sec,
            is_marathon as i32,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get session history (most recent first).
pub fn get_sessions(conn: &Connection, limit: u32) -> Result<Vec<SessionInfo>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, started_at, ended_at, total_episodes, total_seconds, status
             FROM marathon_sessions
             ORDER BY started_at DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let sessions = stmt
        .query_map([limit], |row| {
            Ok(SessionInfo {
                id: row.get(0)?,
                started_at: row.get(1)?,
                ended_at: row.get(2)?,
                total_episodes: row.get(3)?,
                total_seconds: row.get(4)?,
                status: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sessions)
}

// ═══════════════════════════════════════
// SessionInfo type
// ═══════════════════════════════════════

#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub id: u64,
    pub started_at: u64,
    pub ended_at: Option<u64>,
    pub total_episodes: u32,
    pub total_seconds: u64,
    pub status: String,
}

// ═══════════════════════════════════════
// Engine v2 helpers
// ═══════════════════════════════════════

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Reset items stuck as 'active' from a previous crashed session.
/// Called at engine start. Sets them back to 'queued' so they're picked up.
pub fn reset_stale_active(conn: &Connection) -> Result<u32, String> {
    let count = conn
        .execute(
            "UPDATE marathon_queue SET status = 'queued' WHERE status = 'active'",
            [],
        )
        .map_err(|e| e.to_string())?;
    Ok(count as u32)
}

/// Reset all 'error' items back to 'queued' (for infinite mode retry).
pub fn reset_errors(conn: &Connection) -> Result<u32, String> {
    let count = conn
        .execute(
            "UPDATE marathon_queue SET status = 'queued', error_message = NULL WHERE status = 'error'",
            [],
        )
        .map_err(|e| e.to_string())?;
    Ok(count as u32)
}

/// Check if anime is already in queue (any status except 'done').
pub fn is_in_queue(conn: &Connection, anime_id: u64) -> Result<bool, String> {
    let count: u32 = conn
        .query_row(
            "SELECT COUNT(*) FROM marathon_queue WHERE anime_id = ?1 AND status != 'done'",
            [anime_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

/// Record that we farmed an anime (for deduplication).
pub fn record_farmed(conn: &Connection, anime_id: u64, episode_count: u32) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO marathon_watched (anime_id, farmed_at, episode_count)
         VALUES (?1, unixepoch(), ?2)",
        rusqlite::params![anime_id, episode_count],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get anime IDs that were farmed within the last N days.
pub fn get_recently_farmed_ids(conn: &Connection, days: u32) -> Result<Vec<u64>, String> {
    let cutoff = now_secs() - (days as u64 * 86400);
    let mut stmt = conn
        .prepare("SELECT anime_id FROM marathon_watched WHERE farmed_at >= ?1")
        .map_err(|e| e.to_string())?;

    let ids = stmt
        .query_map([cutoff], |row| row.get::<_, u64>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

/// Clear old entries from marathon_watched (older than 90 days).
pub fn cleanup_watched(conn: &Connection) -> Result<(), String> {
    let cutoff = now_secs() - (90 * 86400);
    conn.execute(
        "DELETE FROM marathon_watched WHERE farmed_at < ?1",
        [cutoff],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
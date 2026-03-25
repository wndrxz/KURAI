use rusqlite::Connection;

/// Get cached thumb privateId for an anime
pub fn get_thumb_id(conn: &Connection, anime_id: u64) -> Option<String> {
    conn.query_row(
        "SELECT thumb_id FROM anime_cache
         WHERE anime_id = ?1
         AND thumb_id IS NOT NULL
         AND (cached_at + ttl_sec) > unixepoch()",
        [anime_id],
        |row| row.get(0),
    )
    .ok()
}

/// Cache the thumb privateId for an anime
pub fn set_thumb_id(conn: &Connection, anime_id: u64, thumb_id: &str) {
    conn.execute(
        "INSERT OR REPLACE INTO anime_cache (anime_id, data, thumb_id, cached_at, ttl_sec)
         VALUES (?1, '{}', ?2, unixepoch(), 86400)",
        rusqlite::params![anime_id, thumb_id],
    )
    .ok();
}

/// Cache full anime JSON data
pub fn set_anime_data(conn: &Connection, anime_id: u64, data: &str, thumb_id: Option<&str>) {
    conn.execute(
        "INSERT OR REPLACE INTO anime_cache (anime_id, data, thumb_id, cached_at, ttl_sec)
         VALUES (?1, ?2, ?3, unixepoch(), 3600)",
        rusqlite::params![anime_id, data, thumb_id],
    )
    .ok();
}

/// Get cached anime JSON data
pub fn get_anime_data(conn: &Connection, anime_id: u64) -> Option<String> {
    conn.query_row(
        "SELECT data FROM anime_cache
         WHERE anime_id = ?1
         AND data != '{}'
         AND (cached_at + ttl_sec) > unixepoch()",
        [anime_id],
        |row| row.get(0),
    )
    .ok()
}
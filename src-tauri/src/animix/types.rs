use serde::{Deserialize, Serialize};

// ═══════════════════════════════════════
// API Response Wrappers
// ═══════════════════════════════════════

#[derive(Deserialize, Debug)]
pub struct ApiSuccess<T> {
    #[serde(rename = "type")]
    pub response_type: String,
    pub data: T,
}

#[derive(Deserialize, Debug)]
pub struct ApiError {
    #[serde(rename = "type")]
    pub response_type: String,
    pub data: ApiErrorData,
}

#[derive(Deserialize, Debug)]
pub struct ApiErrorData {
    pub code: u32,
}

// ═══════════════════════════════════════
// Auth
// ═══════════════════════════════════════

#[derive(Serialize, Debug)]
pub struct LoginRequest {
    pub nickname: String,
    pub password: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoginData {
    pub id: u64,
    pub last_used_timestamp: u64,
    pub key: String,
    pub account_id: u64,
}

// ═══════════════════════════════════════
// User
// ═══════════════════════════════════════

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: u64,
    pub nickname: String,
    pub region: String,
    pub profile_pic: String,
    pub description: Option<String>,
    pub telegram: Option<String>,
    pub banned: bool,
    pub registration_date: u64,
    pub watch_count: u64,
    pub watch_count_last_week: u64,
    pub selected_pic_frame: u32,
    pub last_watched_anime_id: u64,
    pub last_watched_time: u64,
    #[serde(default)]
    pub date_subscription_purchased: u64,
    pub subscription_type: Option<String>,
    pub auto_subscribe: Option<bool>,
    pub subscribed: bool,
    pub friends_list: Vec<u64>,
    pub available_pic_frames: Vec<u32>,
    #[serde(default)]
    pub friends_entities: Vec<serde_json::Value>,
    #[serde(default)]
    pub my_friend: bool,
    #[serde(rename = "mod")]
    pub is_mod: bool,
    pub editor: bool,
    pub private: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub id: u64,
    pub nickname: String,
    pub region: String,
    pub watch_count: u64,
    pub subscribed: bool,
    pub profile_pic: String,
}

impl From<User> for UserInfo {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            nickname: u.nickname,
            region: u.region,
            watch_count: u.watch_count,
            subscribed: u.subscribed,
            profile_pic: u.profile_pic,
        }
    }
}

// ═══════════════════════════════════════
// Anime
// ═══════════════════════════════════════

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Anime {
    pub id: u64,
    pub thumb: Option<String>,
    pub name: String,
    pub description: String,
    pub production_dates: String,
    pub genres: String,
    pub blacklisted_countries: String,
    pub pg: u32,
    pub rating: f64,
    pub user_rating: f64,
    pub available: bool,
    pub created_at: u64,
    pub updated_at: u64,
    pub announce: String,
    pub studio: Option<String>,
    pub movie: Option<bool>,
    pub hq: Option<bool>,
    pub watch_count: u64,
    pub viral: f64,
    pub subscribed: bool,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct SearchAnime {
    pub id: u64,
    pub name: String,
    pub genres: Vec<String>,
    pub studio: Option<String>,
    pub available: bool,
    pub movie: Option<bool>,
    pub hq: Option<bool>,
    pub rating: f64,
    pub viral: f64,
}

#[derive(Deserialize, Debug)]
pub struct SearchResponse {
    pub anime: Vec<SearchAnime>,
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SearchParams {
    pub query: Option<String>,
    pub page: u32,
    pub genres: Option<String>,
    pub studio: Option<String>,
    pub movie: Option<bool>,
    pub hq: Option<bool>,
    pub min_rating: Option<f64>,
    pub max_rating: Option<f64>,
}

// ═══════════════════════════════════════
// Series / Video
// ═══════════════════════════════════════

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Series {
    pub id: u64,
    pub private_id: String,
    pub thumb: Option<String>,
    pub anime_id: u64,
    pub season: u32,
    pub series_num: u32,
    pub uploaded_at: u64,
    pub uploaded_by: u64,
    pub size: u64,
    pub status: u32,
    pub processing_priority: u32,
    pub video_quality: String,
    pub notify_encoded: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QualityOption {
    pub series_id: u64,
    pub private_id: String,
    pub quality: String,
    pub label: String,
}

// ═══════════════════════════════════════
// Watch Progress
// ═══════════════════════════════════════

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StartWatchData {
    pub start_time: u64,
    pub series_id: u64,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WatchEntry {
    pub private_video_id: String,
    pub anime_name: String,
    pub anime_id: u64,
    pub series_id: u64,
    pub time_sec: u64,
    pub season: u32,
    pub series: u32,
    pub watched: bool,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SeriesWatchEntry {
    pub id: u64,
    pub watched_time_sec: u64,
    pub anime_id: u64,
    pub series_id: u64,
    pub user_id: u64,
    pub seen_time: u64,
    pub watched: bool,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SkipMark {
    pub id: u64,
    pub anime_id: u64,
    pub season: u32,
    pub series_num: u32,
    pub label: String,
    pub start_time: u64,
    pub finish_time: u64,
    pub auto_skip: bool,
}

// ═══════════════════════════════════════
// Collections
// ═══════════════════════════════════════

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: u64,
    pub anime_ids: Vec<u64>,
    pub name: String,
    pub user_id: u64,
    pub system: bool,
    #[serde(default)]
    pub anime_list: Vec<Anime>,
}

// ═══════════════════════════════════════
// Recommendations
// ═══════════════════════════════════════

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct Recommendations {
    #[serde(rename = "NEURAL", default)]
    pub neural: Option<Vec<Anime>>,
    #[serde(rename = "VIRAL", default)]
    pub viral: Option<Vec<Anime>>,
    #[serde(rename = "USER_RATING", default)]
    pub user_rating: Option<Vec<Anime>>,
    #[serde(rename = "RATING", default)]
    pub rating: Option<Vec<Anime>>,
    #[serde(rename = "CATEGORY", default)]
    pub category: Option<RecCategory>,
    #[serde(rename = "REVIEW", default)]
    pub review: Option<RecReview>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RecCategory {
    #[serde(default)]
    pub id: u64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub anime_ids: Vec<u64>,
    #[serde(default)]
    pub anime_list: Vec<Anime>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RecReview {
    #[serde(default)]
    pub anime_entity: Option<Anime>,
    #[serde(default)]
    pub review_entity: Option<ReviewEntry>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReviewEntry {
    pub id: u64,
    pub user_id: u64,
    pub anime_id: u64,
    pub message: String,
    pub stars: u32,
    pub date: u64,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: u64,
    pub anime_ids: Vec<u64>,
    pub name: String,
    pub priority: u32,
    pub available: bool,
    #[serde(default)]
    pub anime_list: Vec<Anime>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: u64,
    pub user_id: u64,
    pub date: u64,
    pub message: String,
    pub url: String,
    #[serde(rename = "type")]
    pub notification_type: String,
}

// ═══════════════════════════════════════
// Player
// ═══════════════════════════════════════

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackInfo {
    pub anime_id: u64,
    pub anime_title: String,
    pub season: u32,
    pub episode: u32,
    pub series_id: u64,
    pub video_url: String,
    pub quality: String,
    pub skip_marks: Vec<SkipMark>,
}

// ═══════════════════════════════════════
// Marathon Queue
// ═══════════════════════════════════════

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueueItem {
    pub id: u64,
    pub anime_id: u64,
    pub anime_title: String,
    pub total_episodes: u32,
    pub start_ep: u32,
    pub end_ep: Option<u32>,
    pub current_ep: u32,
    pub current_season: u32,
    pub status: String,
    pub position: u32,
    pub farmed_count: u32,
}

// ═══════════════════════════════════════
// Marathon Status (UPDATED — with infinite + breaks)
// ═══════════════════════════════════════

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MarathonStatus {
    pub active: bool,
    pub paused: bool,
    pub infinite: bool,
    pub on_break: bool,
    pub break_ends_at: Option<u64>,
    pub current_anime: Option<String>,
    pub current_episode: Option<u32>,
    pub current_season: Option<u32>,
    pub total_farmed: u32,
    pub session_started_at: Option<u64>,
    pub queue_remaining: u32,
    pub episodes_per_hour: f64,
}

// ═══════════════════════════════════════
// Marathon Engine Events (Rust → Frontend)
// ═══════════════════════════════════════

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EpisodeDone {
    pub anime_title: String,
    pub episode: u32,
    pub season: u32,
}

#[derive(Serialize, Clone, Debug)]
pub struct MarathonError {
    pub message: String,
    pub will_retry: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MarathonComplete {
    pub total_episodes: u32,
    pub total_time_sec: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayEpisodeEvent {
    pub anime_id: u64,
    pub anime_title: String,
    pub season: u32,
    pub episode: u32,
    pub series_id: u64,
    pub private_id: String,
}

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

pub fn thumb_url(private_id: &str) -> String {
    format!(
        "https://api.whitewhale.help/anime/getThumb/{}_thumb.png",
        private_id
    )
}

pub fn quality_label(q: &str) -> &str {
    match q {
        "FULL_HD" => "1080p",
        "QHD" => "1440p",
        "ULTRA_HD" => "4K",
        _ => q,
    }
}
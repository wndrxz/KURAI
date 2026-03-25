use super::client::{AnimixClient, BASE_URL};
use super::types::*;

impl AnimixClient {
    // NOTE: startWatch is GET, not POST
    pub async fn start_watch(&self, series_id: u64) -> Result<StartWatchData, String> {
        self.get_authed(&format!(
            "{}/anime/startWatch?seriesId={}",
            BASE_URL, series_id
        ))
        .await
    }

    // NOTE: endWatch is GET, not POST
    // Returns 413 if timeSec > real elapsed time
    pub async fn end_watch(&self, series_id: u64, time_sec: u64) -> Result<(), String> {
        self.get_authed_unit(&format!(
            "{}/anime/endWatch?seriesId={}&timeSec={}",
            BASE_URL, series_id, time_sec
        ))
        .await
    }

    pub async fn get_last_watch(&self) -> Result<Vec<WatchEntry>, String> {
        self.get_authed(&format!("{}/anime/getLastWatch", BASE_URL))
            .await
    }

    // NOTE: API typo — "Hsitory" not "History"
    pub async fn get_user_watch_history(
        &self,
        user_id: u64,
        page: u32,
    ) -> Result<Vec<WatchEntry>, String> {
        self.get_authed(&format!(
            "{}/anime/getUserWatchHsitory?userId={}&page={}",
            BASE_URL, user_id, page
        ))
        .await
    }

    // NOTE: API typo — "Hsitory" not "History"
    pub async fn get_series_watch_history(
        &self,
        series_id: u64,
    ) -> Result<Option<SeriesWatchEntry>, String> {
        self.get_authed(&format!(
            "{}/anime/getWatchHsitory?seriesId={}",
            BASE_URL, series_id
        ))
        .await
    }

    pub async fn get_skip_marks(
        &self,
        anime_id: u64,
        season: u32,
        episode: u32,
    ) -> Result<Vec<SkipMark>, String> {
        self.get_authed(&format!(
            "{}/skipMarks/get?animeId={}&seasonNum={}&seriesNum={}",
            BASE_URL, anime_id, season, episode
        ))
        .await
    }
}
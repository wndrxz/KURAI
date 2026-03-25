use std::collections::HashMap;

use super::client::{AnimixClient, BASE_URL};
use super::types::*;

impl AnimixClient {
    pub async fn get_series(
        &self,
        anime_id: u64,
    ) -> Result<HashMap<String, Vec<Series>>, String> {
        self.get_authed(&format!(
            "{}/anime/getSeries?animeId={}",
            BASE_URL, anime_id
        ))
        .await
    }

    pub async fn get_series_qualities(
        &self,
        anime_id: u64,
        season: u32,
        episode: u32,
    ) -> Result<Vec<QualityOption>, String> {
        let series_list: Vec<Series> = self
            .get_authed(&format!(
                "{}/anime/getSeriesQualities?animeId={}&seasonNum={}&seriesNum={}",
                BASE_URL, anime_id, season, episode
            ))
            .await?;

        let options: Vec<QualityOption> = series_list
            .iter()
            .map(|s| QualityOption {
                series_id: s.id,
                private_id: s.private_id.clone(),
                quality: s.video_quality.clone(),
                label: quality_label(&s.video_quality).to_string(),
            })
            .collect();

        if options.is_empty() {
            return Err(format!(
                "Episode {} not found in season {}",
                episode, season
            ));
        }

        Ok(options)
    }

    pub async fn get_first_episode_private_id(
        &self,
        anime_id: u64,
    ) -> Result<String, String> {
        let seasons = self.get_series(anime_id).await?;

        let first_season = seasons
            .get("1")
            .or_else(|| {
                let mut keys: Vec<&String> = seasons.keys().collect();
                keys.sort();
                keys.first().and_then(|k| seasons.get(*k))
            })
            .ok_or("No seasons found")?;

        let first_ep = first_season
            .iter()
            .min_by_key(|s| s.series_num)
            .ok_or("No episodes found")?;

        Ok(first_ep.private_id.clone())
    }
}
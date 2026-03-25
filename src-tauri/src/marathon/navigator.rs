use std::collections::HashMap;

use crate::animix::types::Series;

/// One episode in the flat sequential list.
#[derive(Clone, Debug)]
pub struct EpisodeEntry {
    pub season: u32,
    pub episode: u32, // series_num
    pub series: Series,
}

/// Flattened, sorted list of all episodes across all seasons.
/// Provides sequential iteration and lookup.
pub struct Navigator {
    episodes: Vec<EpisodeEntry>,
}

impl Navigator {
    /// Build from getSeries response.
    /// Consumes the HashMap. Filters to status==3 (available), sorts by season then episode.
    pub fn from_series(mut seasons: HashMap<String, Vec<Series>>) -> Self {
        let mut season_keys: Vec<String> = seasons.keys().cloned().collect();
        season_keys.sort_by_key(|k| k.parse::<u32>().unwrap_or(0));

        let mut episodes = Vec::new();

        for key in &season_keys {
            let season_num = key.parse::<u32>().unwrap_or(0);
            if let Some(mut eps) = seasons.remove(key) {
                eps.retain(|s| s.status == 3);
                eps.sort_by_key(|s| s.series_num);
                for series in eps {
                    episodes.push(EpisodeEntry {
                        season: season_num,
                        episode: series.series_num,
                        series,
                    });
                }
            }
        }

        Self { episodes }
    }

    /// Get episode by flat 1-based index.
    /// Index 1 = first episode of first season.
    pub fn at(&self, index: usize) -> Option<&EpisodeEntry> {
        if index == 0 {
            return None;
        }
        self.episodes.get(index - 1)
    }

    /// Find by (season, series_num). Returns (0-based index, entry).
    pub fn find(&self, season: u32, episode: u32) -> Option<(usize, &EpisodeEntry)> {
        self.episodes
            .iter()
            .enumerate()
            .find(|(_, e)| e.season == season && e.episode == episode)
    }

    /// Get next episode after (season, episode). Returns None if this was the last.
    pub fn next_after(&self, season: u32, episode: u32) -> Option<&EpisodeEntry> {
        let (idx, _) = self.find(season, episode)?;
        self.episodes.get(idx + 1)
    }

    pub fn len(&self) -> usize {
        self.episodes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.episodes.is_empty()
    }
}
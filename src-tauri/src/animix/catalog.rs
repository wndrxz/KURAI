use super::client::{AnimixClient, BASE_URL};
use super::types::*;

impl AnimixClient {
    pub async fn get_all(&self, page: u32) -> Result<Vec<Anime>, String> {
        self.get_authed(&format!("{}/anime/getAll?page={}", BASE_URL, page))
            .await
    }

    pub async fn get_anime(&self, id: u64) -> Result<Anime, String> {
        self.get_authed(&format!("{}/anime/get?id={}", BASE_URL, id))
            .await
    }

    pub async fn is_blacklisted(&self, anime_id: u64) -> Result<bool, String> {
        self.get_authed(&format!(
            "{}/anime/isBlacklisted?animeId={}",
            BASE_URL, anime_id
        ))
        .await
    }

    pub async fn get_categories(&self) -> Result<Vec<Category>, String> {
        self.get_authed(&format!("{}/anime/getCategories", BASE_URL))
            .await
    }

    pub async fn search_filtered(
        &self,
        params: SearchParams,
    ) -> Result<Vec<SearchAnime>, String> {
        let mut url = format!(
            "{}/search/searchFiltered?page={}",
            BASE_URL, params.page
        );

        if let Some(ref q) = params.query {
            if !q.is_empty() {
                url.push_str(&format!("&query={}", urlencoding::encode(q)));
            }
        }
        if let Some(ref g) = params.genres {
            if !g.is_empty() {
                url.push_str(&format!("&genres={}", urlencoding::encode(g)));
            }
        }
        if let Some(ref s) = params.studio {
            if !s.is_empty() {
                url.push_str(&format!("&studio={}", urlencoding::encode(s)));
            }
        }
        if let Some(m) = params.movie {
            url.push_str(&format!("&movie={}", m));
        }
        if let Some(h) = params.hq {
            url.push_str(&format!("&hq={}", h));
        }
        if let Some(min) = params.min_rating {
            url.push_str(&format!("&minRating={}", min));
        }
        if let Some(max) = params.max_rating {
            url.push_str(&format!("&maxRating={}", max));
        }

        let resp: SearchResponse = self.get_authed(&url).await?;
        Ok(resp.anime)
    }
}
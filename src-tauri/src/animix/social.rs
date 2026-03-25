use super::client::{AnimixClient, BASE_URL};
use super::types::*;

impl AnimixClient {
    pub async fn get_collections(&self, user_id: u64) -> Result<Vec<Collection>, String> {
        self.get_authed(&format!(
            "{}/collections/getCollections?userId={}",
            BASE_URL, user_id
        ))
        .await
    }

    pub async fn get_recommendations(&self) -> Result<Recommendations, String> {
        self.get_authed(&format!("{}/recs/get", BASE_URL)).await
    }

    pub async fn get_notifications(&self, page: u32) -> Result<Vec<Notification>, String> {
        self.get_authed(&format!(
            "{}/notifications/get?page={}",
            BASE_URL, page
        ))
        .await
    }
}
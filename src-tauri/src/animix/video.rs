use super::client::{AnimixClient, CDN_URL};

impl AnimixClient {
    pub async fn resolve_video_url(&self, private_id: &str) -> Result<String, String> {
        // Step 1: optimal server (NO auth needed for CDN)
        let server: String = self
            .get_public(&format!(
                "{}/balancer/getOptimalServer?privateId={}",
                CDN_URL, private_id
            ))
            .await?;

        let server = server.trim_end_matches('/').to_string();

        // Step 2: watch session (NO auth needed)
        let session: String = self
            .get_public(&format!(
                "{}/content/getWatchSession?privateId={}",
                server, private_id
            ))
            .await?;

        // Step 3: final URL
        Ok(format!("{}/content/watch/{}", server, session))
    }
}
use reqwest::header;
use reqwest::Client;
use serde::de::DeserializeOwned;
use tokio::sync::RwLock;

use super::types::*;

pub const BASE_URL: &str = "https://api.whitewhale.help";
pub const CDN_URL: &str = "https://cdn.animix.lol";

fn truncate_str(s: &str, max_chars: usize) -> &str {
    match s.char_indices().nth(max_chars) {
        Some((idx, _)) => &s[..idx],
        None => s,
    }
}

pub struct AnimixClient {
    pub(crate) http: Client,
    pub(crate) token: RwLock<Option<String>>,
    pub(crate) account_id: RwLock<Option<u64>>,
}

impl AnimixClient {
    pub fn new() -> Self {
        let mut headers = header::HeaderMap::new();
        headers.insert("Origin", "https://animix.lol".parse().unwrap());
        headers.insert("Referer", "https://animix.lol/".parse().unwrap());

        let http = Client::builder()
            .default_headers(headers)
            .timeout(std::time::Duration::from_secs(30))
            .connect_timeout(std::time::Duration::from_secs(10))
            .pool_idle_timeout(std::time::Duration::from_secs(30))
            .pool_max_idle_per_host(2)
            .tcp_nodelay(true)
            .tcp_keepalive(std::time::Duration::from_secs(60))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            http,
            token: RwLock::new(None),
            account_id: RwLock::new(None),
        }
    }

    pub async fn set_token(&self, token: String) {
        *self.token.write().await = Some(token);
    }

    pub async fn set_account_id(&self, id: u64) {
        *self.account_id.write().await = Some(id);
    }

    pub async fn get_account_id(&self) -> Option<u64> {
        *self.account_id.read().await
    }

    pub async fn clear_auth(&self) {
        *self.token.write().await = None;
        *self.account_id.write().await = None;
    }

    pub async fn is_authenticated(&self) -> bool {
        self.token.read().await.is_some()
    }

    pub(crate) async fn auth_header(&self) -> Result<String, String> {
        self.token
            .read()
            .await
            .as_ref()
            .map(|t| format!("Bearer {}", t))
            .ok_or_else(|| "Not authenticated".into())
    }

    pub(crate) async fn get_authed<T: DeserializeOwned>(
        &self,
        url: &str,
    ) -> Result<T, String> {
        let auth = self.auth_header().await?;
        let resp = self
            .http
            .get(url)
            .header("Authorization", &auth)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = resp.status();

        if status == reqwest::StatusCode::PAYLOAD_TOO_LARGE {
            return Err("413: Content too large".into());
        }

        let text = resp.text().await.map_err(|e| e.to_string())?;

        if let Ok(success) = serde_json::from_str::<ApiSuccess<T>>(&text) {
            if success.response_type == "success" {
                return Ok(success.data);
            }
        }

        if let Ok(err) = serde_json::from_str::<ApiError>(&text) {
            return Err(format!("API error: code {}", err.data.code));
        }

        Err(format!("HTTP {}: {}", status, truncate_str(&text, 200)))
    }

    pub(crate) async fn get_public<T: DeserializeOwned>(
        &self,
        url: &str,
    ) -> Result<T, String> {
        let resp = self
            .http
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| e.to_string())?;

        if let Ok(success) = serde_json::from_str::<ApiSuccess<T>>(&text) {
            if success.response_type == "success" {
                return Ok(success.data);
            }
        }

        if let Ok(err) = serde_json::from_str::<ApiError>(&text) {
            return Err(format!("API error: code {}", err.data.code));
        }

        Err(format!("HTTP {}: {}", status, truncate_str(&text, 200)))
    }

    pub(crate) async fn get_authed_unit(&self, url: &str) -> Result<(), String> {
        let _: serde_json::Value = self.get_authed(url).await?;
        Ok(())
    }
}
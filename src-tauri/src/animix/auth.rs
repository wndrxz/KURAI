use super::client::{AnimixClient, BASE_URL};
use super::types::*;

impl AnimixClient {
    pub async fn login(&self, nickname: &str, password: &str) -> Result<LoginData, String> {
        let url = format!("{}/auth/login", BASE_URL);
        let body = LoginRequest {
            nickname: nickname.to_string(),
            password: password.to_string(),
        };

        let resp = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Login request failed: {}", e))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| e.to_string())?;

        if let Ok(success) = serde_json::from_str::<ApiSuccess<LoginData>>(&text) {
            if success.response_type == "success" {
                return Ok(success.data);
            }
        }

        if let Ok(err) = serde_json::from_str::<ApiError>(&text) {
            return Err(match err.data.code {
                2 => "Неверный логин или пароль".into(),
                6 => "Недействительный токен".into(),
                _ => format!("Ошибка авторизации: код {}", err.data.code),
            });
        }

        Err(format!("HTTP {}: {}", status, &text[..text.len().min(200)]))
    }

    pub async fn get_self(&self) -> Result<User, String> {
        self.get_authed(&format!("{}/account/getSelf", BASE_URL))
            .await
    }

    pub async fn get_user(&self, username: &str) -> Result<User, String> {
        self.get_authed(&format!(
            "{}/account/get?username={}",
            BASE_URL,
            urlencoding::encode(username)
        ))
        .await
    }

    pub async fn get_email(&self) -> Result<String, String> {
        self.get_authed(&format!("{}/account/getEmail", BASE_URL))
            .await
    }
}
use base64::{engine::general_purpose::STANDARD, Engine};
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use ring::rand::{SecureRandom, SystemRandom};

const KEY_BYTES: &[u8; 32] = b"kurai_app_secret_key_2024_v01!!X";

pub fn encrypt(plaintext: &str) -> Result<String, String> {
    let rng = SystemRandom::new();
    let unbound = UnboundKey::new(&AES_256_GCM, KEY_BYTES).map_err(|e| e.to_string())?;
    let key = LessSafeKey::new(unbound);

    let mut nonce_bytes = [0u8; 12];
    rng.fill(&mut nonce_bytes).map_err(|e| e.to_string())?;
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);

    let mut in_out = plaintext.as_bytes().to_vec();
    key.seal_in_place_append_tag(nonce, Aad::empty(), &mut in_out)
        .map_err(|e| e.to_string())?;

    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&in_out);
    Ok(STANDARD.encode(&result))
}

pub fn decrypt(ciphertext_b64: &str) -> Result<String, String> {
    let data = STANDARD.decode(ciphertext_b64).map_err(|e| e.to_string())?;
    if data.len() < 12 {
        return Err("Invalid ciphertext".into());
    }

    let (nonce_bytes, encrypted) = data.split_at(12);
    let nonce_arr: [u8; 12] = nonce_bytes.try_into().map_err(|_| "Bad nonce".to_string())?;
    let nonce = Nonce::assume_unique_for_key(nonce_arr);

    let unbound = UnboundKey::new(&AES_256_GCM, KEY_BYTES).map_err(|e| e.to_string())?;
    let key = LessSafeKey::new(unbound);

    let mut in_out = encrypted.to_vec();
    let plaintext = key
        .open_in_place(nonce, Aad::empty(), &mut in_out)
        .map_err(|e| e.to_string())?;

    String::from_utf8(plaintext.to_vec()).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let original = "test_token_12345";
        let encrypted = encrypt(original).unwrap();
        let decrypted = decrypt(&encrypted).unwrap();
        assert_eq!(original, decrypted);
    }

    #[test]
    fn roundtrip_cyrillic() {
        let original = "токен_кириллица_тест";
        let encrypted = encrypt(original).unwrap();
        let decrypted = decrypt(&encrypted).unwrap();
        assert_eq!(original, decrypted);
    }
}
use crate::animix::types::PlaybackInfo;

pub struct PlaybackState {
    pub current: Option<PlaybackInfo>,
    pub position_sec: f64,
    pub duration_sec: f64,
    pub paused: bool,
    pub volume: f64,
}

impl PlaybackState {
    pub fn new() -> Self {
        Self {
            current: None,
            position_sec: 0.0,
            duration_sec: 0.0,
            paused: true,
            volume: 1.0,
        }
    }
}
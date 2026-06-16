use serde::Serialize;
use walkdir::WalkDir;

/// File extensions we treat as playable audio when scanning a folder.
/// Note: actual decode support in v1 depends on the platform WebView.
/// Windows (WebView2/Chromium) decodes all of these; macOS (WKWebView)
/// decodes MP3/M4A/AAC/WAV/AIFF/FLAC reliably but may not decode OGG/Opus.
/// See README "Supported formats".
const AUDIO_EXTS: &[&str] = &[
    "mp3", "m4a", "aac", "wav", "wave", "aif", "aiff", "flac", "ogg", "oga", "opus",
];

#[derive(Serialize)]
struct TrackInfo {
    path: String,
    file_name: String,
}

/// Recursively scan `path` for audio files, returned sorted by path.
#[tauri::command]
fn scan_music_folder(path: String) -> Result<Vec<TrackInfo>, String> {
    let mut tracks: Vec<TrackInfo> = WalkDir::new(&path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|entry| {
            let p = entry.path();
            let ext = p.extension()?.to_str()?.to_lowercase();
            if !AUDIO_EXTS.contains(&ext.as_str()) {
                return None;
            }
            Some(TrackInfo {
                path: p.to_string_lossy().into_owned(),
                file_name: p.file_name()?.to_string_lossy().into_owned(),
            })
        })
        .collect();

    tracks.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    Ok(tracks)
}

/// Read an audio file's raw bytes. Returned as a raw IPC response (no base64),
/// so the frontend receives an ArrayBuffer it can hand to `decodeAudioData`
/// and `music-metadata`'s `parseBlob`.
#[tauri::command]
fn read_audio_bytes(path: String) -> Result<tauri::ipc::Response, String> {
    std::fs::read(&path)
        .map(tauri::ipc::Response::new)
        .map_err(|e| format!("failed to read {path}: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_music_folder, read_audio_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

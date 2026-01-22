#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct BackendProcess(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Get path to bundled backend
            let resource_path = app_handle
                .path()
                .resource_dir()
                .expect("failed to resolve resource directory");

            let backend_script = resource_path.join("backend").join("index.ts");

            // Spawn Bun backend in a separate thread
            std::thread::spawn(move || {
                let child = Command::new("bun")
                    .arg("run")
                    .arg(&backend_script)
                    .spawn();

                match child {
                    Ok(process) => {
                        println!("Backend started with PID: {}", process.id());
                        if let Some(state) = app_handle.try_state::<BackendProcess>() {
                            *state.0.lock().unwrap() = Some(process);
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to start backend: {}. Make sure 'bun' is installed.", e);
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Kill backend when window closes
                let app = window.app_handle();
                if let Some(state) = app.try_state::<BackendProcess>() {
                    if let Some(ref mut child) = *state.0.lock().unwrap() {
                        let _ = child.kill();
                        println!("Backend process terminated");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(debug_assertions))]
use std::sync::Mutex;
#[cfg(not(debug_assertions))]
use tauri::Manager;

#[cfg(not(debug_assertions))]
use std::process::{Child, Command};

#[cfg(not(debug_assertions))]
struct BackendProcess(Mutex<Option<Child>>);

fn main() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init());

    #[cfg(not(debug_assertions))]
    {
        builder = builder.manage(BackendProcess(Mutex::new(None)));
    }

    builder
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            let app_handle = app.handle().clone();

            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                // Open DevTools automatically in development mode
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                    println!("DevTools opened automatically in debug mode");
                }
            }
            // Only spawn backend in production builds
            // In development, beforeDevCommand handles it
            #[cfg(not(debug_assertions))]
            {
                // Production mode: use bundled resources
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
            }

            #[cfg(debug_assertions)]
            println!("Development mode: Backend managed by beforeDevCommand");

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                #[cfg(not(debug_assertions))]
                {
                    // Kill backend when window closes (production only)
                    let app = _window.app_handle();
                    if let Some(state) = app.try_state::<BackendProcess>() {
                        if let Some(ref mut child) = *state.0.lock().unwrap() {
                            let _ = child.kill();
                            println!("Backend process terminated");
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

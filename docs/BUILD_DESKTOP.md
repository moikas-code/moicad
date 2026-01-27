# Building moicad Desktop App

moicad can be built as a native desktop application using Tauri. This guide covers building for Arch Linux (primary), macOS, and Windows.

## Prerequisites

All platforms require:
- **Rust & Cargo**: Install via [rustup](https://rustup.rs/)
- **Bun runtime**: Install via `curl -fsSL https://bun.sh/install | bash`
- **wasm-pack**: Install via `cargo install wasm-pack`
- **Tauri CLI**: Install via `cargo install tauri-cli`

## Arch Linux (Primary Platform)

### Install Dependencies

```bash
# System dependencies
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module gtk3 libappindicator-gtk3 librsvg

# Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# wasm-pack and Tauri CLI
cargo install wasm-pack tauri-cli
```

### Build

```bash
# Clone and enter project
cd moicad

# Install JS dependencies
bun install
cd frontend && npm install && cd ..

# Build WASM module
cd wasm && wasm-pack build --target web && cd ..

# Build desktop app
cargo tauri build
```

### Output

The built application will be at:
- **AppImage**: `src-tauri/target/release/bundle/appimage/moicad_*.AppImage`
- **deb**: `src-tauri/target/release/bundle/deb/moicad_*.deb`

### Run

```bash
# Run the AppImage directly
chmod +x src-tauri/target/release/bundle/appimage/moicad_*.AppImage
./src-tauri/target/release/bundle/appimage/moicad_*.AppImage

# Or install the deb package
sudo dpkg -i src-tauri/target/release/bundle/deb/moicad_*.deb
moicad
```

---

## macOS (Self-Build)

### Install Dependencies

```bash
# Xcode command line tools
xcode-select --install

# Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Bun
curl -fsSL https://bun.sh/install | bash

# wasm-pack and Tauri CLI
cargo install wasm-pack tauri-cli
```

### Build

```bash
cd moicad

# Install dependencies
bun install
cd frontend && npm install && cd ..

# Build WASM
cd wasm && wasm-pack build --target web && cd ..

# Build for macOS
cargo tauri build
# Or for specific architecture:
cargo tauri build --target aarch64-apple-darwin  # Apple Silicon
cargo tauri build --target x86_64-apple-darwin   # Intel
```

### Output

- **DMG**: `src-tauri/target/release/bundle/dmg/moicad_*.dmg`
- **App Bundle**: `src-tauri/target/release/bundle/macos/moicad.app`

---

## Windows (Self-Build)

### Install Dependencies

1. **Visual Studio Build Tools**
   - Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/)
   - Install "Desktop development with C++"

2. **WebView2 Runtime**
   - Usually pre-installed on Windows 10/11
   - Download from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) if needed

3. **Rust**
   ```powershell
   # Download and run rustup-init.exe from https://rustup.rs/
   ```

4. **Bun**
   ```powershell
   # PowerShell (run as Administrator)
   irm bun.sh/install.ps1 | iex
   ```

5. **wasm-pack and Tauri CLI**
   ```powershell
   cargo install wasm-pack tauri-cli
   ```

### Build

```powershell
cd moicad

# Install dependencies
bun install
cd frontend && npm install && cd ..

# Build WASM
cd wasm && wasm-pack build --target web && cd ..

# Build for Windows
cargo tauri build
```

### Output

- **MSI Installer**: `src-tauri\target\release\bundle\msi\moicad_*.msi`
- **NSIS Installer**: `src-tauri\target\release\bundle\nsis\moicad_*.exe`

---

## Development Mode

To run in development mode (with hot reload):

```bash
# Terminal 1: Start backend
bun run dev

# Terminal 2: Start Tauri dev mode
cargo tauri dev
```

Or use the combined command:
```bash
bun run tauri:dev
```

---

## Troubleshooting

### "bun: command not found" in Tauri app

The Tauri app requires Bun to be installed and in PATH. Ensure Bun is properly installed:

```bash
# Check if bun is available
which bun
bun --version
```

### WebKit/GTK errors on Linux

Install the required GTK dependencies:

```bash
# Arch Linux
sudo pacman -S webkit2gtk-4.1 gtk3

# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev
```

### Build fails with WASM errors

Ensure wasm-pack is installed and WASM is built first:

```bash
cargo install wasm-pack
cd wasm && wasm-pack build --target web && cd ..
```

### Port 42069 already in use

The backend server uses port 42069. Kill any existing processes:

```bash
# Linux/macOS
lsof -ti:42069 | xargs kill -9

# Windows
netstat -ano | findstr 42069
taskkill /PID <PID> /F
```

---

## Project Structure

```
moicad/
├── src-tauri/           # Tauri desktop app
│   ├── src/main.rs      # Rust entry point (spawns backend)
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
├── frontend/            # Next.js frontend
├── backend/             # Bun backend server
├── wasm/                # Rust WASM CSG engine
└── shared/              # Shared TypeScript types
```

---

## npm Scripts

```bash
bun run tauri:dev          # Development mode
bun run tauri:build        # Build for current platform
bun run tauri:build:linux  # Build for Linux (x86_64)
bun run tauri:build:mac    # Build for macOS (ARM64)
bun run tauri:build:win    # Build for Windows (x86_64)
```

# FloZ AI PCB Editor — Web, Windows & Linux Unified Application Architecture

## 1. Architecture Overview
FloZ AI PCB Editor is built using a unified, single-codebase architecture where the core PCB layout engine, schematic capture, DRC, autorouter, zone engine, 3D viewer, and AI copilots are completely platform-agnostic.

```text
                                 ┌─────────────────────────────┐
                                 │   Shared Core EDA Engine    │
                                 │ (PCBData, Router, DRC, 3D)  │
                                 └──────────────┬──────────────┘
                                                │
                                 ┌──────────────┴──────────────┐
                                 │ Platform Abstraction Layer  │
                                 │   (src/platform/index.ts)   │
                                 └───────┬─────────────┬───────┘
                                         │             │
                    ┌────────────────────┴──┐       ┌──┴────────────────────┐
                    │  Web Browser Runtime  │       │  Electron Native App  │
                    │  (Chrome, Firefox,    │       │ (contextIsolation:    │
                    │   Edge, Safari)       │       │  preload bridge)      │
                    └───────────────────────┘       └──┬─────────────────┬──┘
                                                       │                 │
                                             ┌─────────┴───┐       ┌─────┴────────┐
                                             │ Windows x64 │       │  Linux x64   │
                                             │  (NSIS/EXE) │       │(AppImage/deb)│
                                             └─────────────┘       └──────────────┘
```

---

## 2. Platform Abstraction Layer (`src/platform/`)

The platform layer automatically detects whether the app is executing inside a web browser or native desktop container without polluting the PCB engine with OS checks:

- `src/platform/types.ts`: Universal interfaces for file I/O, native dialogs, menu actions, and project files.
- `src/platform/web.ts`: Web browser implementation using Web File System Access API, Blob streams, and `localStorage`.
- `src/platform/desktop.ts`: Electron implementation communicating over secure IPC (`window.flozBridge`).
- `src/platform/index.ts`: Singleton platform accessor exporting `platform: PlatformAPI`.

---

## 3. Project File Format (`.floz`)

Native FloZ project files (`.floz`) store the complete, lossless EDA design state:
- Schematics, sheets, symbols, pins, and wire nets
- PCB layout geometry: 24 layers, tracks, vias, pads, zones, keepouts, texts, and dimensions
- Physical stackup, dielectric constants, copper weights, and solder mask aesthetics
- Net classes (Default, Power, HighSpeed) and DRC constraint rules

---

## 4. Development & Build Workflows

### Web Application
- **Development**:
  ```bash
  npm run dev
  ```
  Starts local Vite dev server at `http://localhost:5173/`.

- **Production Build**:
  ```bash
  npm run build
  ```
  Generates optimized production bundle in `dist/`.

---

### Desktop Application (Electron)
- **Desktop Development**:
  ```bash
  npm run desktop:dev
  ```
  Bundles Electron main/preload scripts and launches native desktop window.

- **Desktop Production Build**:
  ```bash
  npm run desktop:build
  ```
  Builds web bundle into `dist/` and Electron scripts into `dist-electron/`.

---

### Native OS Packaging (`electron-builder`)
- **Windows Package (`.exe` NSIS installer & portable)**:
  ```bash
  npm run dist:win
  ```
  Outputs `release/FloZ-AI-PCB-Editor-Setup-1.0.0.exe` and portable executable.

- **Linux Package (`.AppImage` & `.deb`)**:
  ```bash
  npm run dist:linux
  ```
  Outputs `release/FloZ-AI-PCB-Editor-1.0.0.AppImage` and `.deb` installer.

- **All Multi-Platform Targets**:
  ```bash
  npm run dist:all
  ```

---

## 5. Security & Isolation Architecture

- `contextIsolation: true`: Renderer process is isolated from Node.js runtime.
- `nodeIntegration: false`: Renderer cannot execute raw OS syscalls.
- `electron/preload.ts`: Exposes strict, typed APIs (`openProjectDialog`, `saveProjectDialog`, `exportFileDialog`, `getRecentProjects`).

---

## 6. Automated Verification

Run all automated test suites:
```bash
npm test -- --run
```
Expected output: **23 test suites, 166 passing tests**.

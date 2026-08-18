# QUICK START

```bash
git clone https://github.com/nrnnaveen/PCP-Design-Software.git
cd PCP-Design-Software
npm run setup
npm run dev
```

Open your browser at **`http://localhost:5173`** to access FloZ EDA.

---

# FloZ EDA Local Setup Guide

A complete, beginner-friendly guide to setting up and running **FloZ EDA / Electronic Circuit Architect** on a fresh machine.

---

## 1. Requirements

Before starting, ensure you have the following installed on your system:

| Requirement | Minimum Version | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v18.0.0` or higher | `v20.x` / `v22.x` (LTS) | [Download Node.js](https://nodejs.org/) |
| **npm** | `v9.0.0` or higher | `v10.x` / `v11.x` | Bundled automatically with Node.js |
| **Web Browser** | Modern Browser | Chrome, Edge, Firefox, Brave, Safari | Requires WebGL support for the 3D PCB viewer |
| **Default Port** | `5173` | `5173` | Configurable via CLI flag or `.env` |

> [!NOTE]
> FloZ EDA is a self-contained, browser-first EDA system. No external database servers (PostgreSQL, SQLite, MySQL) or native EDA runtimes (KiCad C++ binaries) are required. All schematic capture, auto-routing, DRC/ERC, 3D WebGL rendering, and Gerber/Drill generation run entirely in the browser runtime.

---

## 2. Clone the Repository

Clone the project repository to your local machine using Git:

```bash
git clone https://github.com/nrnnaveen/PCP-Design-Software.git
cd PCP-Design-Software
```

*(Or navigate into your extracted project directory if downloaded as a ZIP file).*

---

## 3. Install Dependencies

Install the required npm packages. You can use either the automated setup script or standard `npm install`:

```bash
# Automated setup command
npm run setup

# Or standard install
npm install
```

This installs all core dependencies:
- **React 19 & React-DOM**: Component UI architecture.
- **Three.js**: 3D WebGL substrate, copper layers, and component package rendering.
- **Lucide-React**: EDA CAD tool and menu icon set.
- **JSZip**: Manufacturing ZIP package generator (Gerber files, Excellon drill files, BOM, Pick & Place, KiCad exports).
- **TailwindCSS & PostCSS**: Engineering CAD workspace styling.
- **TypeScript & Vite**: Type-safe builds and instant Hot Module Replacement (HMR).
- **Vitest**: 100+ automated EDA test suites.

---

## 4. Environment Configuration

FloZ EDA works **100% out of the box** with zero configuration.

If you wish to configure optional settings (custom development port, remote AI endpoints, or custom models), copy the provided `.env.example` file:

### On Linux / macOS:
```bash
cp .env.example .env
```

### On Windows (Command Prompt):
```cmd
copy .env.example .env
```

### On Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

### Configuration Variables in `.env`:

```ini
# Development Server Port (Default: 5173)
VITE_DEV_PORT=5173

# Optional: AI Provider ('local', 'openrouter', or 'ollama')
# By default, FloZ uses its built-in deterministic heuristic EDA compiler
VITE_AI_PROVIDER=local
VITE_AI_BASE_URL=https://openrouter.ai/api/v1
VITE_AI_MODEL=openrouter/free

# Optional: Remote AI API Key (Can also be set in-app via the AI Settings modal)
VITE_AI_API_KEY=
```

---

## 5. Library & EDA Asset Setup

FloZ EDA includes all required EDA assets bundled directly inside the repository:
- **Built-in Symbols**: Passives (Resistors, Capacitors, Inductors, Crystals), Diodes, LEDs, Transistors/MOSFETs, Voltage Regulators (LDOs), Microcontrollers (STM32, ESP32), Sensors (SHT31, BME280), Logic ICs (4010, 7400, NE555, LM358), and Connectors (USB-C, Headers).
- **Footprints**: Standard SMD packages (`0402`, `0603`, `0805`, `1206`, `SOT-23`, `SOIC-8`, `SOIC-14`, `SOIC-16`, `LQFP-48`) and Through-Hole packages (`DIP-8`, `DIP-14`, `DIP-16`, Radial Electrolytics, Pin Headers, USB-C 16-pin).
- **KiCad Import**: You can import external `.kicad_sym` and `.kicad_mod` files directly using the **Library Manager** in the UI. Imported assets are automatically cached in browser `localStorage`.
- **Portability**: All libraries use project-relative paths. There are no hardcoded machine-specific absolute paths.

---

## 6. Run Development Server

Start the local Vite development server:

```bash
npm run dev
```

Output:
```text
  VITE v6.x.x  ready in 180 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

Open **`http://localhost:5173`** in your browser.

### Custom Port Selection:
If port `5173` is already in use by another application, specify an alternative port:

```bash
npm run dev -- --port 3000
```

---

## 7. Run Automated Tests

FloZ EDA includes a comprehensive automated test suite validating schematic generation, PCB auto-placement, 45° octilinear routing, copper pours, ERC/DRC verification, KiCad exports, Gerber generation, multi-unit symbol handling, and AI workflows.

Run all tests:

```bash
npm test
```

Expected result:
```text
 ✓ src/tests/adversarialQACertification.test.ts (11 tests)
 ✓ src/tests/aiAssistant.test.ts (6 tests)
 ✓ src/tests/aiCircuitGenerationPipeline.test.ts (14 tests)
 ✓ src/tests/aiRealWorldAcceptance.test.ts (10 tests)
 ✓ src/tests/aiSafetyValidation.test.ts (8 tests)
 ✓ src/tests/connectivity.test.ts (2 tests)
 ✓ src/tests/core.test.ts (3 tests)
 ✓ src/tests/endToEndAIEDAWorkflow.test.ts (9 tests)
 ✓ src/tests/erc.test.ts (3 tests)
 ✓ src/tests/kicadParser.test.ts (3 tests)
 ✓ src/tests/libraryImport.test.ts (2 tests)
 ✓ src/tests/manufacturingGradeValidation.test.ts (7 tests)
 ✓ src/tests/multiUnitSymbolImport.test.ts (7 tests)
 ✓ src/tests/router.test.ts (5 tests)
 ✓ src/tests/schematicCanvasInteractions.test.ts (5 tests)
 ✓ src/tests/schematicConnectivity.test.ts (5 tests)
 ✓ src/tests/symbolDragPlacement.test.ts (2 tests)

 Test Files  17 passed (17)
      Tests  102 passed (102)
```

---

## 8. Production Build

To compile a minified, production-ready static web bundle:

```bash
npm run build
```

This compiles TypeScript definitions (`tsc`) and bundles optimized assets into the `dist/` directory.

---

## 9. Production Preview

To test and preview the production build locally:

```bash
npm run preview
```

Open the preview URL printed in the terminal (usually `http://localhost:4173`).

---

## 10. Platform-Specific Setup

### Windows
1. Install [Node.js LTS (Windows Installer)](https://nodejs.org/).
2. Open **PowerShell**, **Windows Terminal**, or **Command Prompt**.
3. Run:
   ```powershell
   git clone https://github.com/nrnnaveen/PCP-Design-Software.git
   cd PCP-Design-Software
   npm run setup
   npm run dev
   ```
4. *Optional*: If execution policy blocks scripts in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` or use Command Prompt (`cmd.exe`).

### Linux (Ubuntu / Debian / Fedora / Arch)
1. Install Node.js via your package manager or [NodeSource](https://github.com/nodesource/distributions):
   ```bash
   # Ubuntu / Debian
   sudo apt update && sudo apt install -y nodejs npm git

   # Fedora
   sudo dnf install -y nodejs npm git

   # Arch Linux
   sudo pacman -S nodejs npm git
   ```
2. Clone and start:
   ```bash
   git clone https://github.com/nrnnaveen/PCP-Design-Software.git
   cd PCP-Design-Software
   npm run setup
   npm run dev
   ```

### macOS (Apple Silicon & Intel)
1. Ensure [Homebrew](https://brew.sh/) or [Node.js](https://nodejs.org/) is installed:
   ```bash
   brew install node git
   ```
2. Clone and start:
   ```bash
   git clone https://github.com/nrnnaveen/PCP-Design-Software.git
   cd PCP-Design-Software
   npm run setup
   npm run dev
   ```

---

## 11. Troubleshooting

### Q: Port 5173 is already in use
**Solution**: Run on another port:
```bash
npm run dev -- --port 8080
```

### Q: 3D View appears blank or black
**Solution**:
- Ensure **Hardware Acceleration** is enabled in your browser settings (`Settings` $\rightarrow$ `System` $\rightarrow$ `Use graphics acceleration when available`).
- Update your GPU graphics drivers.

### Q: How do I reset local project storage?
**Solution**:
- In the browser, open Developer Tools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`).
- Go to `Application` $\rightarrow$ `Storage` $\rightarrow$ `Local Storage`.
- Click **Clear All** or remove `floz_autosave_project_v1` and reload the page.

### Q: Can I run this offline without internet?
**Solution**:
Yes! FloZ EDA contains a built-in deterministic heuristic EDA engine. All schematic synthesis, DRC/ERC, autorouting, and 3D preview work 100% offline.

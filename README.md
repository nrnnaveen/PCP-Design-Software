# FloZ EDA — Electronic Circuit Architect

An autonomous, browser-first **Electronic Design Automation (EDA)** platform with natural-language AI schematic synthesis, 45° octilinear auto-routing, continuous ground planes, interactive 3D WebGL PCB inspection, multi-unit symbol support, live ERC/DRC verification, and manufacturing export (Gerber, Drill, BOM, Pick & Place, KiCad).

---

## Quick Start

```bash
git clone https://github.com/nrnnaveen/PCP-Design-Software.git
cd PCP-Design-Software
npm run setup
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## Documentation

- **[Local Setup Guide (LOCAL_SETUP.md)](./LOCAL_SETUP.md)** — Detailed cross-platform installation and setup instructions for Windows, macOS, and Linux.
- **[Auditing & Validation Report (FLOZ_EDA_AUDIT.md)](./FLOZ_EDA_AUDIT.md)** — Comprehensive architecture, test results, and validation reports.

---

## Core Scripts

- `npm run setup` — Automatically installs dependencies.
- `npm run dev` — Starts the local development server at `http://localhost:5173`.
- `npm test` — Executes the automated test suite (102 tests passing).
- `npm run build` — Compiles the TypeScript project and creates an optimized production bundle in `dist/`.
- `npm run preview` — Previews the production bundle locally.

-Team 

--Collab--

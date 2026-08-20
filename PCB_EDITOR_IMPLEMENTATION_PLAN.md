# FLOZ AI PCB EDITOR — ULTIMATE PROFESSIONAL PCB LAYOUT ENGINE IMPLEMENTATION PLAN

## 1. Current State Assessment
- **State Model**: `ApexProject` containing `schematic`, `pcb`, `netGraph`, `designRules`, `ercConfig`, `drcConfig`, `settings`.
- **PCB Subsystem**: `src/pcb/PCBEditor.tsx` provides 2D canvas with basic 45° route preview, drag footprint, and layer toggles.
- **Router**: `src/router/router.ts` computes basic 45° octilinear path between 2 points and detects pad clicks.
- **Ratsnest**: `src/pcb/ratsnest.ts` builds MST unrouted airwires between same-net pads.
- **Zones**: `src/pcb/zoneGenerator.ts` generates ground planes with board outline bounding box.
- **DRC**: `src/drc/drcEngine.ts` checks basic track widths, via drill sizes, and clearances.
- **3D Viewer**: `src/three3d/Board3DViewer.tsx` renders board using Three.js with FR4 core, soldermask, and components.

---

## 2. Architecture Gaps & Limitations
1. **Layer Hierarchy**: Only F.Cu, B.Cu, Edge.Cuts, and F.Silkscreen were exposed. Missing all 20+ standard technical layers (Paste, Mask, Adhesive, Courtyard, Fab, Inner copper layers, User layers).
2. **Interactive Routing & Via Flow**: Missing in-progress via placement with automatic copper layer switching during routing; missing posture flipping (\), track width switching (NetClass default vs predefined), and obstacle clearance calculations.
3. **Appearance Panel**: Missing dedicated 3-tab Appearance inspector (Layers, Objects, Nets) with opacity, solo/dim mode, and net highlighting.
4. **Board Setup & Stackup Dialog**: Missing full multi-tab modal for Physical Stackup (copper weights, dielectric thicknesses, solder mask/silkscreen colors), Board Finish (HASL, ENIG, OSP), and Net Class constraint rules.
5. **Copper Zone Filling**: Zone fill was an outline polygon without actual geometric obstacle clipping around foreign pads, vias, and tracks.
6. **Object Inspector**: Properties panel lacked dedicated editors for selected tracks, vias, zones, dimensions, texts, and board outlines.
7. **Selection & CAD Ergonomics**: Missing rubber-band box multi-selection, alignment/distribution tools, and right-click context menu.

---

## 3. Target Architecture
- **Single Source of Truth (`PCBData` / `ApexProject`)**: Centralized data structure for all PCB entities.
- **Multi-Layer Vector Canvas Engine**: Fast 60 FPS HTML5 canvas with per-layer render passes, layer opacity, dimming, and LOD (Level-of-Detail).
- **Interactive Router & Via Engine (`InteractiveRouter`)**: Real-time 45°/90°/free-angle path calculation, obstacle proximity checks, automatic via insertion on layer toggle (`V`), netclass width enforcement.
- **Copper Zone Geometry Engine (`ZoneEngine`)**: Real geometric polygon boolean clipping with clearance offsets and 4-spoke thermal reliefs.
- **Appearance & Layer Manager (`AppearancePanel`)**: Complete 3-tab docking panel for Layers, Objects, and Nets.
- **Board Setup & Physical Stackup (`BoardSetupModal`)**: Full modal dialog for layers, stackup layers, board finish, and design rule net classes.
- **Live Properties Inspector (`PropertiesPanel`)**: Rich context-aware inspector for Footprints, Pads, Tracks, Vias, Zones, Texts, and Dimensions.
- **Subsystem Synchronization**: Canvas, Properties, Appearance, Ratsnest, DRC, 3D Board Viewer, AI Assistant, and Gerber Export always operate on the identical underlying PCB data model with transactional undo/redo.

---

## 4. Implementation Phases

- **Phase 1**: Types & Model Enhancement (`src/core/types.ts`)
- **Phase 2**: Professional Interactive PCB Canvas & Rendering (`src/pcb/PCBEditor.tsx`)
- **Phase 3**: Interactive Routing, Via Insertion & Real-Time Clearance (`src/router/router.ts`)
- **Phase 4**: Copper Zone Geometry & Thermal Relief Engine (`src/pcb/zoneEngine.ts`)
- **Phase 5**: Appearance Panel (Layers, Objects, Nets) (`src/pcb/AppearancePanel.tsx`)
- **Phase 6**: Board Setup & Physical Stackup Dialog (`src/pcb/BoardSetupModal.tsx`)
- **Phase 7**: Object Properties Inspector & Context Menu (`src/ui/PropertiesPanel.tsx`)
- **Phase 8**: Synchronization with 3D Viewer & DRC (`src/three3d/Board3DViewer.tsx`, `src/drc/drcEngine.ts`)
- **Phase 9**: Integration into `AppShell.tsx` with Toolbars, Status Bar & Hotkeys
- **Phase 10**: Automated & Manual Verification Suite (`src/tests/pcbLayoutEngine.test.ts`)

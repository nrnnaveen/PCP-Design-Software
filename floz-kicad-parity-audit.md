# FloZ ECA — KiCad Feature Parity Audit & Repository Analysis

**Author**: Senior EDA Software Architect & Product QA  
**Target Product**: FloZ ECA — Professional Electronic Circuit Architect  
**Reference Benchmark**: KiCad EDA System Architecture  

---

## 1. What FloZ ECA Already Implements (Solid Baseline)

1. **Model-Tool-View (MTV) Decoupled Architecture**:
   - `src/core/transformMatrix.ts`: 2D Homogeneous Affine Transformation engine with subpixel precision, inverse mapping, and high-DPI scaling.
   - `src/core/toolManager.ts`: Finite State Machine dispatcher with `IDLE`, `IN_PROGRESS`, `SUSPENDED`, `COMMITTED`, `CANCELLED` lifecycle states.
   - `src/core/migrationAdapter.ts`: Automatic Schema 2.0 versioning, migration, and physical stackup defaults.
   - `src/core/transaction.ts`: Invertible atomic action history for transactional Undo/Redo.
2. **Schematic Editor Subsystem**:
   - Multi-sheet schematic capture canvas with high-DPI resolution.
   - Configurable grid snapping (`100 mil / 50 mil / 25 mil`).
   - Orthogonal Manhattan rubber-banding with elbow shifts (`RubberBandRouter`) keeping pin connections attached during component translations.
   - Real-time Electrical Rules Checker (`ERCEngine`) anchored with coordinate badges and hover tooltips.
   - Symbol placement, rotation, mirroring, deletion, and property inspection.
3. **PCB Layout Subsystem**:
   - Multi-layer canvas engine (Top Copper, Bottom Copper, In1-In4, Silkscreen, Mask, Paste, Fab, Courtyard, Edge.Cuts).
   - 45° and 90° interactive track routing with magnetic pad lock and active-layer color synchronization.
   - Via placement with automatic copper annular rings and drill cutouts.
   - Copper Zone Pour FSM (`ZoneToolFSM`) with single-vertex backspace undo, non-destructive segment cancellation, and obstacle clearance.
   - Multi-layer Board Setup manager (1L, 2L, 4L, 6L, 8L, and Flex 2L presets) with copper thickness (1oz/2oz / 35µm/70µm), dielectric permittivity $\varepsilon_r$, and Flex coverlay/stiffeners.
   - 2D Vector CAD Drawing tools (Rectangles, Circles, Polygons, Dimensions, Technical Text).
4. **3D WebGL Visualization Subsystem**:
   - Real-time board substrate extrusion (1 unit = 1 mm).
   - Deterministic board outline centering at origin $(0, 0, 0)$.
   - Orbital camera state preservation across board updates.
   - Physically Based Rendering (PBR) materials for FR-4 core, Polyimide Amber flex, ENIG Gold, HASL Tin, and Bare Copper.
5. **Manufacturing, Utilities & Packaging**:
   - Gerber generator (RS-274X) and Excellon NC drill export.
   - Gerber Viewer module with layer toggles.
   - PCB Engineering Calculators (Trace width, via current, track impedance).
   - Cross-platform packaging: Linux AppImage, Windows portable executable, Windows ZIP, and Web bundle.
   - 25 test suites with 188 automated tests passing at 100%.

---

## 2. What Is Partially Implemented & Needs Upgrading to KiCad-Class

1. **Buses, Global Labels, No-Connect Flags**:
   - Schematic currently supports local Net Labels and Wires, but lacks KiCad-style Buses (`D[0..7]`), Bus Entries, Global Labels, and explicit No-Connect (`X`) flags on unused pins.
2. **Selection Filter System**:
   - Users need granular selection filters in both Schematic (Symbols, Wires, Labels, Text) and PCB (Footprints, Tracks, Vias, Zones, Graphics, Text) to avoid accidental multi-selection during complex edits.
3. **Schematic Annotation & Footprint Assignment**:
   - Needs automated multi-symbol re-annotation (`R? -> R1, R2...`) and inline footprint association browser.
4. **PCB Appearance Panel & Net Highlighting**:
   - Needs a unified dockable KiCad-style Appearance Panel controlling layer visibility, layer dimming/inactive opacity, individual net color highlights, and ratsnest filtering.
5. **Differential Pair & Length Tuning Indicators**:
   - Needs interactive differential pair track routing preview and meander length tuning indicators for high-speed design constraints.
6. **Drawing Sheet / Title Block**:
   - Needs professional schematic border and ANSI/ISO title block (Company, Project, Revision, Date, Sheet Number).

---

## 3. What Is Unnecessary / "AI Taste" & Must Be Cleaned Up

1. **Buzzwords & Over-decorated Labels**:
   - Ordinary CAD operations labeled with "AI Smart", "Intelligent", "Magic" must be renamed to standard technical terminology:
     - `AI Smart Router` $\to$ `Interactive Router`
     - `AI Intelligent Layer Manager` $\to$ `Layer Manager & Appearance`
     - `AI Synthesis Health` $\to$ `Design Rules & Health Verification`
2. **Visual Clutter & Animations**:
   - Remove any remaining `animate-ping`, pulsing border shaders, oversized SaaS cards, and glowing buttons.
   - Standardize on a calm, dense, technical CAD theme with crisp contrast, clean borders, and high information density.

---

## 4. Architectural Preservation Plan

- **Preserve**:
  - `src/core/transformMatrix.ts` (Affine matrix engine)
  - `src/core/toolManager.ts` (Tool FSM)
  - `src/core/migrationAdapter.ts` & `serialization.ts` (Schema 2.0)
  - `src/core/transaction.ts` (Undo/Redo)
  - `src/router/router.ts` & `src/schematic/rubberBandRouter.ts` (Routing engines)
  - `src/three3d/Board3DViewer.tsx` (Three.js WebGL engine)
- **Upgrade In-Place**:
  - `src/theme/themeManager.ts`: Introduce centralized design tokens and set `High Contrast Professional` as the default theme.
  - `src/schematic/SchematicEditor.tsx`: Add Buses, No-Connect flags, Global Labels, Drawing Title Block, and Selection Filter.
  - `src/pcb/PCBEditor.tsx` & `src/pcb/AppearancePanel.tsx`: Add PCB Selection Filter, Differential Pair routing preview, and expanded DRC.
  - `src/ui/PropertiesPanel.tsx`: Unified multi-selection property inspector.

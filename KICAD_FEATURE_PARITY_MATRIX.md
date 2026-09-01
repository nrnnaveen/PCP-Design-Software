# FloZ ECA vs. KiCad Feature Parity Matrix

**Document Purpose**: Comprehensive feature breakdown comparing FloZ ECA capabilities against KiCad industry benchmarks.

---

## Parity Classification Matrix

| Subsystem | KiCad Capability | FloZ ECA Status | Priority | Implementation Strategy | Notes |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Core Architecture** | Model-Tool-View Decoupling | **COMPLETE** | REQUIRED | `src/core/toolManager.ts` | State machine with tool lifecycles |
| **Core Architecture** | Homogeneous 2D Affine Matrix | **COMPLETE** | REQUIRED | `src/core/transformMatrix.ts` | Subpixel world/screen math & high-DPI |
| **Core Architecture** | Schema Versioning & Migrations | **COMPLETE** | REQUIRED | `src/core/migrationAdapter.ts` | Auto-migrates legacy to Schema 2.0 |
| **Core Architecture** | Transactional Undo / Redo | **COMPLETE** | REQUIRED | `src/core/transaction.ts` | Invertible action stack |
| **Schematic Editor** | Manhattan Orthogonal Routing | **COMPLETE** | REQUIRED | `src/schematic/rubberBandRouter.ts`| Dynamic elbow shifts on symbol move |
| **Schematic Editor** | Standard Grid Snapping | **COMPLETE** | REQUIRED | `src/schematic/SchematicEditor.tsx` | 100 mil, 50 mil, 25 mil presets |
| **Schematic Editor** | Buses & Bus Entries | **HIGH VALUE** | REQUIRED | `src/schematic/SchematicEditor.tsx` | Bus drawing with vector syntax D[0..7] |
| **Schematic Editor** | No-Connect Flags (X) | **HIGH VALUE** | REQUIRED | `src/schematic/SchematicEditor.tsx` | Explicit pin no-connect markers |
| **Schematic Editor** | Global / Hierarchical Labels | **HIGH VALUE** | REQUIRED | `src/schematic/SchematicEditor.tsx` | Off-sheet / global port markers |
| **Schematic Editor** | Schematic Drawing Title Block | **HIGH VALUE** | REQUIRED | `src/schematic/SchematicEditor.tsx` | ANSI/ISO drawing border & metadata |
| **Schematic Editor** | Selection Filter | **HIGH VALUE** | REQUIRED | `src/schematic/SchematicEditor.tsx` | Filter Symbols, Wires, Labels, Text |
| **Schematic Editor** | Real-time ERC Diagnostics | **COMPLETE** | REQUIRED | `src/erc/ercEngine.ts` | Unconnected pins, floating nets, etc. |
| **Schematic Editor** | Automated Annotation (R? -> R1)| **HIGH VALUE** | HIGH VALUE | `src/schematic/SchematicEditor.tsx` | Renumber reference designators |
| **PCB Layout** | Multi-layer Copper Stackup | **COMPLETE** | REQUIRED | `src/pcb/BoardSetupModal.tsx` | 1L, 2L, 4L, 6L, 8L, and Flex 2L presets |
| **PCB Layout** | Rigid-Flex & Coverlay Layers | **COMPLETE** | REQUIRED | `src/pcb/layers.ts` | F/B.Coverlay, Stiffeners, Bend.Lines |
| **PCB Layout** | 45°/90° Interactive Routing | **COMPLETE** | REQUIRED | `src/router/router.ts` | Magnetic pad lock & active layer color |
| **PCB Layout** | Differential Pair Routing | **HIGH VALUE** | HIGH VALUE | `src/router/router.ts` | Coupled track routing preview |
| **PCB Layout** | Length Tuning Indicators | **HIGH VALUE** | HIGH VALUE | `src/pcb/PCBEditor.tsx` | Target trace length & meander delta |
| **PCB Layout** | Copper Zone Pour FSM | **COMPLETE** | REQUIRED | `src/pcb/zoneToolFSM.ts` | Backspace single undo, loop closure |
| **PCB Layout** | 2D CAD Vector Geometry | **COMPLETE** | REQUIRED | `src/pcb/cadDrawingTools.ts` | Rect, Circle, Polygon, Dim, Text |
| **PCB Layout** | PCB Appearance Panel | **HIGH VALUE** | REQUIRED | `src/pcb/AppearancePanel.tsx` | Layer visibility, opacity, net highlight |
| **PCB Layout** | Design Rules Check (DRC) | **COMPLETE** | REQUIRED | `src/drc/drcEngine.ts` | Clearances, trace width, via drill |
| **PCB Layout** | Selection Filter | **HIGH VALUE** | REQUIRED | `src/pcb/PCBEditor.tsx` | Filter Footprints, Tracks, Vias, Zones |
| **3D Board Viewer** | 1unit = 1mm Substrate Centering| **COMPLETE** | REQUIRED | `src/three3d/Board3DViewer.tsx` | Origin centered at (0,0,0) |
| **3D Board Viewer** | PBR Substrates & Metal Finishes| **COMPLETE** | REQUIRED | `src/three3d/Board3DViewer.tsx` | FR-4, Polyimide, ENIG, HASL, Bare Cu |
| **3D Board Viewer** | Camera State Preservation | **COMPLETE** | REQUIRED | `src/three3d/Board3DViewer.tsx` | Orbit preserved on board updates |
| **Manufacturing** | RS-274X Gerber & Excellon Drill| **COMPLETE** | REQUIRED | `src/manufacturing/` | Standard Gerber zip package |
| **Manufacturing** | Bill of Materials (BOM CSV) | **COMPLETE** | REQUIRED | `src/manufacturing/bomGenerator.ts` | Formatted engineering BOM export |
| **Manufacturing** | Pick & Place (CPL CSV) | **COMPLETE** | REQUIRED | `src/manufacturing/kicadExporter.ts` | Centroid placement coordinates |
| **Utilities** | Gerber Viewer | **COMPLETE** | HIGH VALUE | `src/gerbview/GerberViewer.tsx` | Visual Gerber inspection |
| **Utilities** | PCB Engineering Calculator | **COMPLETE** | HIGH VALUE | `src/calculator/Calculators.tsx` | IPC-2152 trace width & via currents |
| **Utilities** | SPICE Circuit Simulation | **COMPLETE** | HIGH VALUE | `src/simulation/` | Transient & DC operating point |

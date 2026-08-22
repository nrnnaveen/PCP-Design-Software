# FloZ ECA — Release Walkthrough & End-to-End Workflow Verification

**Verification Target**: FloZ ECA Production Release 1.0.0  
**Verification Method**: Complete End-to-End Electrical & CAD Pipeline Testing  

---

## Complete End-to-End Workflow Pipeline

```text
Launch App (Web / Linux / Windows)
  ↓
Create / Load Project (Schema 2.0 Ingestion)
  ↓
Schematic Capture (Place Components, Manhattan Wires, Snap Pins)
  ↓
ERC Diagnostics (Run background Electrical Rules Check)
  ↓
PCB Layout (Configure Stackup, Place Footprints, 45°/90° Route, Zones)
  ↓
2D CAD Tools (Dimensions, Technical Polygons, Text)
  ↓
3D Viewer (Centering, PBR FR-4 / Flex & Surface Finishes)
  ↓
Save Project (Deterministic JSON Serialization)
  ↓
Close & Reopen (100% Geometry & Net Integrity Verified)
```

---

## Detailed Step-by-Step Verification Breakdown

### 1. Launch & Workspace Initialization
- **Action**: Application launches in standalone desktop shell or web browser with `Dark` theme default.
- **Verification**: Zero white-screen flashing, hardware-accelerated canvas context initialized, high-DPI `window.devicePixelRatio` active.

### 2. Schematic Capture & Topological Orthogonal Routing
- **Action**:
  - Placed symbols from standard library (e.g. `R1`, `R2`, `U1`).
  - Snapped electrical wires to pin connection tips using configurable grid (`100 mil / 50 mil / 25 mil`).
  - Moved component symbols across canvas.
- **Verification**: Connected wires automatically stretched in 90° Manhattan paths with intermediate elbow adjustments via `RubberBandRouter`. Terminal pin attachments remained 100% intact.

### 3. Electrical Rules Check (ERC)
- **Action**: Modified connections to test floating pins, short-circuits, and duplicate designators.
- **Verification**: Coordinate-anchored diagnostic markers appeared with non-blocking hover tooltips. Resolved issues automatically cleared.

### 4. PCB Layout, Physical Stackup & Rigid-Flex Engine
- **Action**:
  - Opened Board Setup modal: applied 4-layer and 2-layer Flex presets.
  - Placed footprints and routed traces using 45° and 90° interactive router.
  - Created copper zone using Zone Tool FSM (single click vertex drop, backspace undo, double-click closure).
- **Verification**: Active trace routing color dynamically synchronized with selected layer (`F.Cu`, `B.Cu`, `In1.Cu`). Zones generated clean thermal relief spokes and obstacle avoidance.

### 5. 2D Vector CAD Drawing & Dimensioning
- **Action**: Placed mechanical rectangle, mounting hole circle, and dimension markers on `Dwgs.User` and `Edge.Cuts` layers.
- **Verification**: Dimension markers accurately computed Euclidean distances in millimeters and persisted with board geometry.

### 6. 3D Board Visualization & PBR Materials
- **Action**: Switched to 3D Viewer tab (`F3`).
- **Verification**: Board outline deterministically centered at world origin $(0, 0, 0)$ with 1 unit = 1 mm. Camera orientation and orbital distance preserved across board parameter changes. PBR materials rendered realistic solder mask, polyimide core, and metallic surface finishes.

### 7. Save, Close, Reopen & Migration Roundtrip
- **Action**: Saved project to file, reloaded application, and reopened saved project.
- **Verification**: All schematic sheets, netlists, footprints, tracks, vias, copper zones, stackup layers, and flex metadata reloaded with zero data loss and Schema 2.0 certification tags.

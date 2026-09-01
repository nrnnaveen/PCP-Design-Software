# FloZ ECA — Architectural Blueprint & Engineering Design

**Document Version**: 2.0.0  
**Architecture Pattern**: Decoupled Model-Tool-View (MTV) with Central Event Dispatch & Affine Transforms  

---

## 1. Architectural Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                 APPLICATION SHELL                                 |
|     +-------------------------+ +---------------------+ +--------------------+    |
|     |  Electron Native Shell  | |  Vite Web Runtime   | | Desktop Menu / IPC |    |
|     +-------------------------+ +---------------------+ +--------------------+    |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                           VIEW LAYER (Reactive UI & Renderers)                    |
|  +--------------------+ +--------------------+ +--------------------+ +---------+ |
|  |  Schematic Canvas  | |  PCB Layout Canvas | | 3D WebGL (Three.js)| | Insp. &  | |
|  |  (2D Affine View)  | |  (Multi-Layer CAD) | | (PBR Raytracing)   | | Panels  | |
|  +--------------------+ +--------------------+ +--------------------+ +---------+ |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                         TOOL LAYER (Finite State Machines)                        |
|  +--------------------+ +--------------------+ +--------------------+ +---------+ |
|  | Wire & Bus Tools   | | Interactive Router | | Zone & Via FSM     | | Measure | |
|  | (RubberBand Engine)| | (45° / 90° / Diff) | | (Polygon Clipper)  | | Tools   | |
|  +--------------------+ +--------------------+ +--------------------+ +---------+ |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                   MODEL LAYER (Single Source of Truth & Validation)               |
|  +--------------------+ +--------------------+ +--------------------+ +---------+ |
|  | Unified Netlist &  | | Design Rules (DRC) | | Electrical (ERC)   | | Schema  | |
|  | Connectivity Engine| | Clearance Engine   | | Pin Collision Mtx  | | Migrator| |
|  +--------------------+ +--------------------+ +--------------------+ +---------+ |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1 2D Affine Viewport Engine (`src/core/transformMatrix.ts`)
Converts seamlessly between World Coordinates (Millimeters / Mils) and Screen Pixels ($X_{px}, Y_{px}$) through $3 \times 3$ homogeneous affine matrices:
$$\begin{bmatrix} X_{screen} \\ Y_{screen} \\ 1 \end{bmatrix} = \begin{bmatrix} S_x & 0 & T_x \\ 0 & S_y & T_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} X_{world} \\ Y_{world} \\ 1 \end{bmatrix}$$
This guarantees sub-pixel snapping accuracy and zoom-invariant CAD rendering.

### 2.2 Tool Dispatcher Finite State Machine (`src/core/toolManager.ts`)
Decouples user input events (MouseDown, MouseMove, MouseUp, KeyDown) from canvas presentation. Tools maintain isolated lifecycle states:
- `IDLE` -> `DRAGGING_OBJECT` -> `COMMIT`
- `IDLE` -> `ROUTING_TRACK` -> `LAYER_SWITCH_VIA` -> `COMPLETED`
- `IDLE` -> `ZONE_DRAWING` -> `POLYGON_CLOSING` -> `FILLED`

### 2.3 Interactive 45°/90° Router & Rubber-Band Topology (`src/router/router.ts` & `src/schematic/rubberBandRouter.ts`)
Calculates optimal octilinear and orthogonal segments in real time with obstacle avoidance and live short-circuit prevention.

### 2.4 DRC & ERC Engines (`src/drc/drcEngine.ts` & `src/erc/ercEngine.ts`)
Performs deterministic spatial and electrical validation across net classes, trace widths, copper clearances, hole-to-hole drills, and component courtyards.

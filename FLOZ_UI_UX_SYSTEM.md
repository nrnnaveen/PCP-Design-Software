# FloZ ECA — Professional Engineering UI/UX Design System

**Document Version**: 2.0.0  
**Design Philosophy**: High-Density, Crisp Contrast, Zero-Distraction CAD Ergonomics  

---

## 1. Design Philosophy & Principles

FloZ ECA is engineered strictly for professional electrical and electronics engineers. The user interface eliminates superfluous SaaS decoration, neon glows, slow animations, and oversized padding in favor of:

1. **Information Density**: Compact toolbars, 11px/12px data readouts, monospace engineering dimensions, and collapsible side docks.
2. **Deterministic Feedback**: Live coordinate readouts ($X, Y$), delta indicators ($\Delta X, \Delta Y$), track length tuning HUDs, and real-time net connectivity status.
3. **Contrast & Legibility**: High-contrast dark workspaces with pure white typography, standardized layer colors, and crisp vector overlays.
4. **Zero AI Gimmicks**: AI assistance is encapsulated cleanly within an on-demand side panel. Ordinary CAD commands use standard technical engineering terminology.

---

## 2. Multi-Theme Color Token Architecture

The design system is powered by central color tokens (`CanvasColorTokens` and CSS variables) supporting 5 distinct themes:

| Theme Name | Theme ID | Background | Grid Pattern | Primary Text | Target Environment |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **High Contrast Dark** *(Default)* | `dark` | `#111418` | `#242c38` / `#384354` | `#e2e8f0` | General engineering workspaces |
| **High Contrast Monochrome** | `high-contrast` | `#000000` | `#444444` / `#666666` | `#ffffff` | High ambient light & accessibility |
| **Light (Day)** | `light` | `#ffffff` | `#e2e8f0` / `#cbd5e1` | `#0f172a` | Daytime drafting & review |
| **Midnight** | `midnight` | `#0b0f19` | `#1e293b` / `#334155` | `#e0e7ff` | Low-strain nighttime drafting |
| **Slate** | `slate` | `#1e293b` | `#334155` / `#475569` | `#f1f5f9` | Industrial CAD workstations |

---

## 3. Standard Layer Color Standards (KiCad-Aligned)

| Layer Identifier | Layer Name | Standard Color | Rendering Style |
| :--- | :--- | :---: | :--- |
| `F.Cu` | Front Copper | `#e05638` | Solid / Alpha 0.85 |
| `B.Cu` | Back Copper | `#3b82f6` | Solid / Alpha 0.85 |
| `In1.Cu` | Inner Copper 1 | `#eab308` | Solid / Alpha 0.75 |
| `In2.Cu` | Inner Copper 2 | `#a855f7` | Solid / Alpha 0.75 |
| `F.Silkscreen` | Front Silkscreen | `#f8fafc` | 0.15mm vector stroke |
| `B.Silkscreen` | Back Silkscreen | `#38bdf8` | 0.15mm vector stroke |
| `F.Mask` | Front Soldermask | `rgba(185, 28, 28, 0.4)` | Translucent mask |
| `B.Mask` | Back Soldermask | `rgba(29, 78, 216, 0.4)` | Translucent mask |
| `Edge.Cuts` | Board Edge Cuts | `#eab308` | 0.20mm boundary stroke |
| `F.Courtyard` | Front Component Courtyard | `#94a3b8` | Dashed bounding box |

---

## 4. Sheet Border & ISO Title Block

The schematic capture engine embeds standard ISO drafting sheet borders with:
- Coordinate grid references (`A, B, C, D` vertical; `1, 2, 3, 4` horizontal).
- Bottom-right standard title block displaying Project Title, Sheet Number, Date, Revision, and Organization metadata.

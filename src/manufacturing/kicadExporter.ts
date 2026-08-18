/**
 * FloZ EDA - KiCad Interchange & Production Exporter
 * Generates valid KiCad v7/v8/v9 compatible .kicad_sch and .kicad_pcb S-Expression files.
 */

import { ApexProject, PCBLayerId, Point2D } from '../core/types';

export class KiCadExporter {
  /**
   * Generates a valid KiCad .kicad_sch (Schematic) S-Expression file
   */
  public static exportSchematic(project: ApexProject): string {
    const sheet = project.schematic.sheets[0] || { symbols: [], wires: [], labels: [], junctions: [] };
    const now = Math.floor(Date.now() / 1000);

    let sch = `(kicad_sch\n`;
    sch += `  (version 20231120)\n`;
    sch += `  (generator "FloZ EDA")\n`;
    sch += `  (generator_version "1.0.0")\n`;
    sch += `  (uuid "${this.pseudoUuid('sch_root')}")\n`;
    sch += `  (paper "A4")\n`;
    sch += `  (title_block\n`;
    sch += `    (title "${project.metadata.name}")\n`;
    sch += `    (date "${new Date().toISOString().split('T')[0]}")\n`;
    sch += `    (rev "${project.metadata.version || '1.0'}")\n`;
    sch += `  )\n\n`;

    // 1. Export Schematic Symbols
    sheet.symbols.forEach((sym, idx) => {
      const uuid = this.pseudoUuid(`sym_${sym.reference}_${idx}`);
      const libId = sym.symbolDefId || sym.value;

      sch += `  (symbol\n`;
      sch += `    (lib_id "${libId}")\n`;
      sch += `    (at ${sym.x.toFixed(2)} ${sym.y.toFixed(2)} ${sym.rotation || 0})\n`;
      sch += `    (unit 1)\n`;
      sch += `    (exclude_from_sim no)\n`;
      sch += `    (in_bom yes)\n`;
      sch += `    (on_board yes)\n`;
      sch += `    (dnp no)\n`;
      sch += `    (uuid "${uuid}")\n`;
      sch += `    (property "Reference" "${sym.reference}" (at ${sym.x.toFixed(2)} ${(sym.y - 4).toFixed(2)} 0)\n`;
      sch += `      (effects (font (size 1.27 1.27)))\n`;
      sch += `    )\n`;
      sch += `    (property "Value" "${sym.value}" (at ${sym.x.toFixed(2)} ${(sym.y + 4).toFixed(2)} 0)\n`;
      sch += `      (effects (font (size 1.27 1.27)))\n`;
      sch += `    )\n`;
      sch += `    (property "Footprint" "${sym.footprint || ''}" (at ${sym.x.toFixed(2)} ${sym.y.toFixed(2)} 0)\n`;
      sch += `      (effects (font (size 1.27 1.27)) (hide yes))\n`;
      sch += `    )\n`;

      // Export symbol pin instances
      sym.pins?.forEach((p) => {
        sch += `    (pin "${p.number}" (uuid "${this.pseudoUuid(`pin_${sym.reference}_${p.number}`)}"))\n`;
      });

      sch += `  )\n\n`;
    });

    // 2. Export Wires
    sheet.wires.forEach((wire, idx) => {
      sch += `  (wire\n`;
      sch += `    (pts (xy ${wire.x1.toFixed(2)} ${wire.y1.toFixed(2)}) (xy ${wire.x2.toFixed(2)} ${wire.y2.toFixed(2)}))\n`;
      sch += `    (stroke (width 0) (type solid))\n`;
      sch += `    (uuid "${this.pseudoUuid(`wire_${idx}`)}")\n`;
      sch += `  )\n`;
    });

    // 3. Export Net Labels
    sheet.labels?.forEach((lbl, idx) => {
      sch += `  (label "${lbl.text}"\n`;
      sch += `    (at ${lbl.x.toFixed(2)} ${lbl.y.toFixed(2)} ${lbl.orientation || 0})\n`;
      sch += `    (effects (font (size 1.27 1.27)) (justify left bottom))\n`;
      sch += `    (uuid "${this.pseudoUuid(`lbl_${idx}`)}")\n`;
      sch += `  )\n`;
    });

    sch += `)\n`;
    return sch;
  }

  /**
   * Generates a valid KiCad .kicad_pcb (PCB Layout) S-Expression file
   */
  public static exportPCB(project: ApexProject): string {
    const pcb = project.pcb;

    // Collect all distinct nets
    const netSet = new Set<string>();
    pcb.tracks.forEach((t) => t.netName && netSet.add(t.netName));
    pcb.vias.forEach((v) => v.netName && netSet.add(v.netName));
    pcb.zones.forEach((z) => z.netName && netSet.add(z.netName));
    pcb.footprints.forEach((fp) => fp.pads.forEach((p) => p.netName && netSet.add(p.netName)));

    const netList = Array.from(netSet).sort();
    const netIdMap = new Map<string, number>();
    netList.forEach((name, idx) => netIdMap.set(name, idx + 1));

    let pcbOut = `(kicad_pcb\n`;
    pcbOut += `  (version 20240108)\n`;
    pcbOut += `  (generator "FloZ EDA")\n`;
    pcbOut += `  (generator_version "1.0.0")\n`;
    pcbOut += `  (general\n`;
    pcbOut += `    (thickness 1.6)\n`;
    pcbOut += `  )\n`;

    // Layer stack
    pcbOut += `  (layers\n`;
    pcbOut += `    (0 "F.Cu" signal)\n`;
    pcbOut += `    (31 "B.Cu" signal)\n`;
    pcbOut += `    (36 "B.SilkS" user "B.Silkscreen")\n`;
    pcbOut += `    (37 "F.SilkS" user "F.Silkscreen")\n`;
    pcbOut += `    (38 "B.Mask" user)\n`;
    pcbOut += `    (39 "F.Mask" user)\n`;
    pcbOut += `    (44 "Edge.Cuts" user)\n`;
    pcbOut += `  )\n\n`;

    // Net Table
    pcbOut += `  (net 0 "")\n`;
    netList.forEach((name) => {
      pcbOut += `  (net ${netIdMap.get(name)} "${name}")\n`;
    });
    pcbOut += `\n`;

    // 1. Export Footprints
    pcb.footprints.forEach((fp, idx) => {
      const layer = fp.layer === 'B.Cu' ? 'B.Cu' : 'F.Cu';
      const fpName = fp.footprintDefId.split(':').pop() || fp.footprintDefId;

      pcbOut += `  (footprint "${fp.footprintDefId}"\n`;
      pcbOut += `    (layer "${layer}")\n`;
      pcbOut += `    (uuid "${this.pseudoUuid(`pcb_fp_${fp.reference}_${idx}`)}")\n`;
      pcbOut += `    (at ${fp.x.toFixed(3)} ${fp.y.toFixed(3)} ${fp.rotation || 0})\n`;
      pcbOut += `    (property "Reference" "${fp.reference}" (at 0 -3 0)\n`;
      pcbOut += `      (layer "${layer === 'F.Cu' ? 'F.SilkS' : 'B.SilkS'}")\n`;
      pcbOut += `      (effects (font (size 1 1) (thickness 0.15)))\n`;
      pcbOut += `    )\n`;
      pcbOut += `    (property "Value" "${fp.value}" (at 0 3 0)\n`;
      pcbOut += `      (layer "${layer === 'F.Cu' ? 'F.SilkS' : 'B.SilkS'}")\n`;
      pcbOut += `      (effects (font (size 1 1) (thickness 0.15)))\n`;
      pcbOut += `    )\n`;

      // Pads
      fp.pads.forEach((pad) => {
        const netNum = pad.netName ? netIdMap.get(pad.netName) || 0 : 0;
        const padType = pad.type === 'through_hole' ? 'thru_hole' : 'smd';
        const padShape = pad.shape === 'circle' ? 'circle' : pad.shape === 'oval' ? 'oval' : 'roundrect';
        const layers = pad.type === 'through_hole'
          ? '"*.Cu" "*.Mask"'
          : layer === 'F.Cu'
          ? '"F.Cu" "F.Paste" "F.Mask"'
          : '"B.Cu" "B.Paste" "B.Mask"';

        pcbOut += `    (pad "${pad.number}" ${padType} ${padShape} (at ${pad.x.toFixed(3)} ${pad.y.toFixed(3)} 0) (size ${pad.width.toFixed(3)} ${pad.height.toFixed(3)}) (layers ${layers})`;
        if (pad.type === 'through_hole' && pad.drillDiameter) {
          pcbOut += ` (drill ${pad.drillDiameter.toFixed(3)})`;
        }
        if (netNum > 0) {
          pcbOut += ` (net ${netNum} "${pad.netName}")`;
        }
        pcbOut += `)\n`;
      });

      pcbOut += `  )\n\n`;
    });

    // 2. Export Tracks
    pcb.tracks.forEach((track, idx) => {
      const netNum = track.netName ? netIdMap.get(track.netName) || 0 : 0;
      const layer = track.layer === 'B.Cu' ? 'B.Cu' : 'F.Cu';

      pcbOut += `  (segment (start ${track.x1.toFixed(3)} ${track.y1.toFixed(3)}) (end ${track.x2.toFixed(3)} ${track.y2.toFixed(3)}) (width ${track.width.toFixed(3)}) (layer "${layer}") (net ${netNum}))\n`;
    });

    // 3. Export Vias
    pcb.vias.forEach((via, idx) => {
      const netNum = via.netName ? netIdMap.get(via.netName) || 0 : 0;

      pcbOut += `  (via (at ${via.x.toFixed(3)} ${via.y.toFixed(3)}) (size ${via.diameter.toFixed(3)}) (drill ${via.drillDiameter.toFixed(3)}) (layers "F.Cu" "B.Cu") (net ${netNum}))\n`;
    });

    // 4. Export Copper Zones (GND Planes)
    pcb.zones.forEach((zone, idx) => {
      const poly = zone.points || (zone.filledPolygons && zone.filledPolygons[0]);
      if (!poly || poly.length < 3) return;
      const netNum = zone.netName ? netIdMap.get(zone.netName) || 0 : 0;
      const layer = zone.layer === 'B.Cu' ? 'B.Cu' : 'F.Cu';

      pcbOut += `  (zone (net ${netNum}) (net_name "${zone.netName || 'GND'}") (layer "${layer}")\n`;
      pcbOut += `    (hatch edge 0.5)\n`;
      pcbOut += `    (connect_pads yes (clearance 0.3))\n`;
      pcbOut += `    (min_thickness 0.25)\n`;
      pcbOut += `    (filled_polygon\n`;
      pcbOut += `      (pts\n`;
      poly.forEach((pt) => {
        pcbOut += `        (xy ${pt.x.toFixed(3)} ${pt.y.toFixed(3)})\n`;
      });
      pcbOut += `      )\n`;
      pcbOut += `    )\n`;
      pcbOut += `  )\n`;
    });

    // 5. Export Board Outline (Edge.Cuts)
    if (pcb.boardOutline.length >= 3) {
      for (let i = 0; i < pcb.boardOutline.length; i++) {
        const p1 = pcb.boardOutline[i];
        const p2 = pcb.boardOutline[(i + 1) % pcb.boardOutline.length];
        pcbOut += `  (gr_line (start ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}) (end ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}) (stroke (width 0.15) (type solid)) (layer "Edge.Cuts"))\n`;
      }
    }

    pcbOut += `)\n`;
    return pcbOut;
  }

  private static pseudoUuid(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex.substr(0, 8)}-4000-8000-000000000000`;
  }
}

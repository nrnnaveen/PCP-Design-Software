/**
 * Apex EDA - Bill of Materials (BOM) & Pick and Place Generators
 * Produces structured procurement tables and centroid SMT placement files.
 */

import { ApexProject, BOMEntry } from '../core/types';

export class BOMGenerator {
  public static generateBOM(project: ApexProject): BOMEntry[] {
    const groupMap: Map<string, BOMEntry> = new Map();

    project.schematic.sheets.forEach((sheet) => {
      sheet.symbols.forEach((sym) => {
        if (sym.reference.startsWith('#')) return; // Skip power flags

        const key = `${sym.value}___${sym.footprint}___${sym.fields.MPN || ''}`;

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            reference: sym.reference,
            value: sym.value,
            footprint: sym.footprint || 'None',
            quantity: 0,
            description: sym.fields.Description || '',
            manufacturer: sym.fields.Manufacturer || '',
            mpn: sym.fields.MPN || sym.value,
            supplier: sym.fields.Supplier || 'DigiKey/Mouser',
            sku: sym.fields.SKU || '',
            designators: [],
          });
        }

        const entry = groupMap.get(key)!;
        if (!entry.designators.includes(sym.reference)) {
          entry.quantity++;
          entry.designators.push(sym.reference);
        }
      });
    });

    const entries = Array.from(groupMap.values());
    entries.forEach((e) => {
      e.designators.sort();
      e.reference = e.designators.join(', ');
    });

    entries.sort((a, b) => a.designators[0].localeCompare(b.designators[0]));
    return entries;
  }

  public static exportCSV(project: ApexProject): string {
    const bom = this.generateBOM(project);
    let csv = `"Reference","Quantity","Value","Footprint","Description","Manufacturer","MPN","Supplier"\n`;

    bom.forEach((b) => {
      csv += `"${b.reference}","${b.quantity}","${b.value}","${b.footprint}","${b.description}","${b.manufacturer}","${b.mpn}","${b.supplier}"\n`;
    });

    return csv;
  }
}

export class PickAndPlaceGenerator {
  public static generate(project: ApexProject): string {
    const pcb = project.pcb;
    let csv = `"Designator","Val","Package","Mid X","Mid Y","Rotation","Layer"\n`;

    pcb.footprints.forEach((fp) => {
      const pkg = fp.footprintDefId.split(':').pop() || fp.footprintDefId;
      csv += `"${fp.reference}","${fp.value}","${pkg}",${fp.x.toFixed(3)},${fp.y.toFixed(3)},${fp.rotation},"${fp.layer === 'F.Cu' ? 'Top' : 'Bottom'}"\n`;
    });

    return csv;
  }
}

/**
 * FloZ EDA - Project Health Dashboard Evaluator
 * Evaluates the 8 core health pillars of the electronic design.
 */

import { ApexProject } from '../core/types';
import { ERCEngine } from '../erc/ercEngine';
import { DRCEngine } from '../drc/drcEngine';
import { AssetResolver } from '../library/assetResolver';

export interface HealthCheckItem {
  key: string;
  label: string;
  status: 'passed' | 'warning' | 'failed';
  details: string;
}

export interface ProjectHealthStatus {
  overallScore: number; // 0 to 100%
  readyForExport: boolean;
  checks: HealthCheckItem[];
  criticalIssuesCount: number;
  warningsCount: number;
}

export class ProjectHealthEvaluator {
  public static evaluate(project: ApexProject): ProjectHealthStatus {
    const checks: HealthCheckItem[] = [];
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const symbols = activeSheet.symbols.filter((s) => !s.reference.startsWith('#'));
    const pcb = project.pcb;

    // 1. Schematic Validity
    const hasSymbols = symbols.length > 0;
    checks.push({
      key: 'schematic',
      label: 'Schematic Valid',
      status: hasSymbols ? 'passed' : 'failed',
      details: hasSymbols ? `${symbols.length} components, ${activeSheet.wires.length} wires` : 'Schematic is empty',
    });

    // 2. Symbols Resolved
    const assetReport = AssetResolver.scanProject(project);
    const missingSymbols = assetReport.missingAssets.filter((a) => a.type === 'symbol');
    checks.push({
      key: 'symbols',
      label: 'Symbols Resolved',
      status: missingSymbols.length === 0 ? 'passed' : 'failed',
      details: missingSymbols.length === 0 ? 'All component symbols resolved' : `${missingSymbols.length} missing symbol definitions`,
    });

    // 3. Footprints Assigned
    const missingFootprints = assetReport.missingAssets.filter((a) => a.type === 'footprint');
    checks.push({
      key: 'footprints',
      label: 'Footprints Assigned',
      status: missingFootprints.length === 0 ? 'passed' : 'failed',
      details: missingFootprints.length === 0 ? 'All footprints valid and assigned' : `${missingFootprints.length} components missing footprints`,
    });

    // 4. PCB Synchronized
    const pcbSynced = hasSymbols && pcb.footprints.length >= symbols.length;
    checks.push({
      key: 'pcb_sync',
      label: 'PCB Synchronized',
      status: pcbSynced ? 'passed' : (symbols.length > 0 ? 'warning' : 'failed'),
      details: pcbSynced ? `${pcb.footprints.length} footprints synchronized` : 'PCB requires ECO synchronization',
    });

    // 5. Nets Connected / Routed
    const hasTracks = pcb.tracks.length > 0;
    checks.push({
      key: 'nets_routed',
      label: 'Nets Routed',
      status: hasTracks ? 'passed' : (pcb.footprints.length > 0 ? 'warning' : 'passed'),
      details: hasTracks ? `${pcb.tracks.length} track segments, ${pcb.vias.length} vias` : 'Unrouted ratsnest connections present',
    });

    // 6. ERC Passed
    const ercViolations = ERCEngine.run(project);
    const ercErrors = ercViolations.filter((v) => v.severity === 'error');
    checks.push({
      key: 'erc',
      label: 'ERC Passed',
      status: ercErrors.length === 0 ? (ercViolations.length === 0 ? 'passed' : 'warning') : 'failed',
      details: ercErrors.length === 0 ? (ercViolations.length === 0 ? 'Schematic clean' : `${ercViolations.length} minor warnings`) : `${ercErrors.length} electrical errors`,
    });

    // 7. DRC Passed
    const drcViolations = DRCEngine.run(project);
    const drcErrors = drcViolations.filter((v) => v.severity === 'error');
    checks.push({
      key: 'drc',
      label: 'DRC Passed',
      status: drcErrors.length === 0 ? (drcViolations.length === 0 ? 'passed' : 'warning') : 'failed',
      details: drcErrors.length === 0 ? (drcViolations.length === 0 ? 'Layout clean' : `${drcViolations.length} design warnings`) : `${drcErrors.length} clearance/layout errors`,
    });

    // 8. 3D Models Resolved
    const missing3D = assetReport.missingAssets.filter((a) => a.type === 'model3d');
    checks.push({
      key: 'models3d',
      label: '3D Models Resolved',
      status: missing3D.length === 0 ? 'passed' : 'warning',
      details: missing3D.length === 0 ? '3D representation synchronized' : `${missing3D.length} components missing 3D models`,
    });

    const criticalCount = checks.filter((c) => c.status === 'failed').length;
    const warningCount = checks.filter((c) => c.status === 'warning').length;
    const passedCount = checks.filter((c) => c.status === 'passed').length;

    const overallScore = Math.round((passedCount / checks.length) * 100);
    const readyForExport = criticalCount === 0 && hasSymbols && pcbSynced && hasTracks;

    return {
      overallScore,
      readyForExport,
      checks,
      criticalIssuesCount: criticalCount,
      warningsCount: warningCount,
    };
  }
}

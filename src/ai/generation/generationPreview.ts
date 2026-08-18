/**
 * FloZ ECA - Generation Preview Helper
 * Formats generation plan previews for human review in the FloZ AI panel.
 */

import { ActionProposal } from '../types';

export class GenerationPreview {
  public static formatPreviewSummary(proposal: ActionProposal): {
    componentCount: number;
    wireCount: number;
    netCount: number;
    summaryMarkdown: string;
  } {
    const compCount = proposal.diff.addedComponents?.length || 0;
    const wireCount = proposal.diff.addedWires?.length || 0;
    const netCount = proposal.diff.connectedNets?.length || 0;

    let md = `### FLOZ AI DESIGN PLAN\n\n`;
    md += `**${proposal.title}**\n\n`;
    md += `${proposal.description}\n\n`;

    if (proposal.diff.addedComponents && proposal.diff.addedComponents.length > 0) {
      md += `#### Components (${compCount}):\n`;
      proposal.diff.addedComponents.forEach((c) => {
        md += `- **${c.reference}**: \`${c.value}\` (${c.footprint || 'Default Footprint'}) at (${c.position.x}, ${c.position.y}) mm\n`;
      });
      md += `\n`;
    }

    if (proposal.diff.addedWires && proposal.diff.addedWires.length > 0) {
      md += `#### Key Connections (${wireCount}):\n`;
      proposal.diff.addedWires.slice(0, 8).forEach((w) => {
        md += `- \`${w.from}\` ➔ \`${w.to}\`\n`;
      });
      if (proposal.diff.addedWires.length > 8) {
        md += `*...and ${proposal.diff.addedWires.length - 8} more connections.*\n`;
      }
      md += `\n`;
    }

    if (proposal.diff.connectedNets && proposal.diff.connectedNets.length > 0) {
      md += `#### Power & Signal Nets:\n`;
      md += `\`${proposal.diff.connectedNets.join('`, `')}\`\n\n`;
    }

    return {
      componentCount: compCount,
      wireCount,
      netCount,
      summaryMarkdown: md,
    };
  }
}

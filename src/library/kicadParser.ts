/**
 * FloZ ECA - KiCad S-Expression Library Parser
 * Recursive S-expression tokenizer and AST parser for KiCad v6+ (.kicad_sym & .kicad_mod) files.
 */

import {
  SymbolDefinition,
  FootprintDefinition,
  SchematicPin,
  SymbolGraphicShape,
  PCBPad,
  FootprintGraphicShape,
  PinElectricalType,
  PadShape,
  PadType,
  PCBLayerId,
  Point2D,
} from '../core/types';

// ==========================================
// 1. S-Expression Tokenizer & AST Types
// ==========================================

export type SExpr = string | SExpr[];

export class SExprParser {
  /**
   * Tokenizes an S-Expression string handling quotes, comments, escapes, and parens
   */
  public static tokenize(input: string): string[] {
    const tokens: string[] = [];
    const len = input.length;
    let i = 0;

    while (i < len) {
      const char = input[i];

      // Skip whitespace
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        i++;
        continue;
      }

      // Skip comments starting with '#'
      if (char === '#') {
        while (i < len && input[i] !== '\n') i++;
        continue;
      }

      // Parentheses
      if (char === '(' || char === ')') {
        tokens.push(char);
        i++;
        continue;
      }

      // Quoted Strings
      if (char === '"') {
        let str = '';
        i++; // skip opening quote
        while (i < len) {
          if (input[i] === '\\' && i + 1 < len) {
            str += input[i + 1];
            i += 2;
          } else if (input[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            str += input[i];
            i++;
          }
        }
        tokens.push(`"${str}"`);
        continue;
      }

      // Unquoted atom/symbol/number
      let atom = '';
      while (i < len && !' \t\r\n()#"'.includes(input[i])) {
        atom += input[i];
        i++;
      }
      if (atom) {
        tokens.push(atom);
      }
    }

    return tokens;
  }

  /**
   * Parses token list into nested S-Expression array
   */
  public static parseTokens(tokens: string[]): SExpr[] {
    let index = 0;

    const parseList = (): SExpr[] => {
      const list: SExpr[] = [];
      while (index < tokens.length) {
        const token = tokens[index++];
        if (token === '(') {
          list.push(parseList());
        } else if (token === ')') {
          return list;
        } else {
          // Strip enclosing quotes if any
          const cleanToken = token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
          list.push(cleanToken);
        }
      }
      return list;
    };

    const root: SExpr[] = [];
    while (index < tokens.length) {
      if (tokens[index] === '(') {
        index++;
        root.push(parseList());
      } else {
        index++;
      }
    }

    return root;
  }

  public static parse(input: string): SExpr[] {
    const tokens = this.tokenize(input);
    return this.parseTokens(tokens);
  }
}

// ==========================================
// 2. Helper AST Navigation Functions
// ==========================================

function getSubList(list: SExpr[], keyword: string): SExpr[] | null {
  for (const item of list) {
    if (Array.isArray(item) && item[0] === keyword) {
      return item;
    }
  }
  return null;
}

function getAllSubLists(list: SExpr[], keyword: string): SExpr[][] {
  const matches: SExpr[][] = [];
  for (const item of list) {
    if (Array.isArray(item) && item[0] === keyword) {
      matches.push(item);
    }
  }
  return matches;
}

function getProperty(list: SExpr[], propKey: string): string {
  const props = getAllSubLists(list, 'property');
  for (const p of props) {
    if (p[1] === propKey && typeof p[2] === 'string') {
      return p[2];
    }
  }
  return '';
}

function mapElectricalType(typeStr: string): PinElectricalType {
  const lower = (typeStr || '').toLowerCase();
  if (lower === 'input') return 'input';
  if (lower === 'output') return 'output';
  if (lower === 'bidirectional') return 'bidirectional';
  if (lower === 'tri_state' || lower === '3state') return 'tri_state';
  if (lower === 'passive') return 'passive';
  if (lower === 'power_in') return 'power_in';
  if (lower === 'power_out') return 'power_out';
  if (lower === 'open_collector') return 'open_collector';
  if (lower === 'open_emitter') return 'open_emitter';
  if (lower === 'no_connect' || lower === 'free') return 'not_connected';
  return 'unspecified';
}

function mapPadShape(shapeStr: string): PadShape {
  const lower = (shapeStr || '').toLowerCase();
  if (lower === 'rect' || lower === 'rectangle') return 'rect';
  if (lower === 'roundrect' || lower === 'round_rect') return 'roundrect';
  if (lower === 'circle' || lower === 'round') return 'circle';
  if (lower === 'oval' || lower === 'oblong') return 'oval';
  return 'rect';
}

function mapLayerName(layerStr: string): PCBLayerId {
  const lower = (layerStr || '').toLowerCase();
  if (lower === 'f.cu' || lower === 'top') return 'F.Cu';
  if (lower === 'b.cu' || lower === 'bottom') return 'B.Cu';
  if (lower.includes('silk') || lower === 'f.silkscreen' || lower === 'f.silk') return 'F.Silkscreen';
  if (lower.includes('bsilk') || lower === 'b.silkscreen' || lower === 'b.silk') return 'B.Silkscreen';
  if (lower.includes('mask') || lower === 'f.mask') return 'F.Mask';
  if (lower.includes('bmask') || lower === 'b.mask') return 'B.Mask';
  if (lower.includes('paste') || lower === 'f.paste') return 'F.Paste';
  if (lower.includes('bpaste') || lower === 'b.paste') return 'B.Paste';
  if (lower.includes('crtyd') || lower === 'f.crtyd') return 'F.CrtYd';
  if (lower.includes('bcrtyd') || lower === 'b.crtyd') return 'B.CrtYd';
  if (lower.includes('fab') || lower === 'f.fab') return 'F.Fab';
  if (lower.includes('bfab') || lower === 'b.fab') return 'B.Fab';
  if (lower.includes('edge') || lower === 'edge.cuts') return 'Edge.Cuts';
  return 'F.Cu';
}

// ==========================================
// 3. KiCad Symbol (.kicad_sym) Parser
// ==========================================

export interface KiCadSymbolParseResult {
  symbols: SymbolDefinition[];
  warnings: string[];
  errors: string[];
}

export class KiCadSymbolParser {
  public static parse(content: string, defaultLibName = 'Imported_Symbols'): KiCadSymbolParseResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const symbols: SymbolDefinition[] = [];

    let ast: SExpr[];
    try {
      ast = SExprParser.parse(content);
    } catch (err: any) {
      errors.push(`S-Expression Parse Error: ${err.message}`);
      return { symbols, warnings, errors };
    }

    if (ast.length === 0) {
      warnings.push('File contains no valid S-expressions.');
      return { symbols, warnings, errors };
    }

    // Top list can be (kicad_symbol_lib ...) or an individual (symbol ...)
    const rootList = ast[0];
    if (!Array.isArray(rootList)) {
      errors.push('Invalid symbol file structure: expected top-level list.');
      return { symbols, warnings, errors };
    }

    let symbolNodes: SExpr[][] = [];

    if (rootList[0] === 'kicad_symbol_lib') {
      symbolNodes = getAllSubLists(rootList, 'symbol');
    } else if (rootList[0] === 'symbol') {
      symbolNodes = [rootList];
    } else {
      errors.push(`Unrecognized top-level keyword: '${rootList[0]}'. Expected 'kicad_symbol_lib' or 'symbol'.`);
      return { symbols, warnings, errors };
    }

    for (const symNode of symbolNodes) {
      try {
        const rawName = typeof symNode[1] === 'string' ? symNode[1] : 'Unnamed_Symbol';
        // Clean name (e.g. "Device:R" -> "R" or preserve prefix)
        const nameParts = rawName.split(':');
        const symName = nameParts.pop() || rawName;
        const libName = nameParts.length > 0 ? nameParts.join(':') : defaultLibName;

        const reference = getProperty(symNode, 'Reference') || 'U';
        const value = getProperty(symNode, 'Value') || symName;
        const footprint = getProperty(symNode, 'Footprint') || '';
        const datasheet = getProperty(symNode, 'Datasheet') || '';
        const description = getProperty(symNode, 'ki_description') || getProperty(symNode, 'Description') || '';
        const keywordsStr = getProperty(symNode, 'ki_keywords') || getProperty(symNode, 'Keywords') || '';
        const keywords = keywordsStr.split(/\s+/).filter(Boolean);

        const pins: SchematicPin[] = [];
        const shapes: SymbolGraphicShape[] = [];

        // Helper to extract pins and shapes recursively from symbol units
        const processSubUnits = (node: SExpr[]) => {
          for (const item of node) {
            if (!Array.isArray(item)) continue;

            const keyword = item[0];

            if (keyword === 'pin') {
              // (pin electrical_type graphic_style (at x y orientation) (length len) (name "NAME" ...) (number "NUM" ...))
              const electType = mapElectricalType(typeof item[1] === 'string' ? item[1] : 'unspecified');
              const atNode = getSubList(item, 'at');
              const lenNode = getSubList(item, 'length');
              const nameNode = getSubList(item, 'name');
              const numNode = getSubList(item, 'number');

              let px = 0, py = 0, rot: 0 | 90 | 180 | 270 = 0;
              if (atNode) {
                px = parseFloat(atNode[1] as string) || 0;
                py = -(parseFloat(atNode[2] as string) || 0); // Invert Y for canvas
                const rawRot = parseInt(atNode[3] as string, 10) || 0;
                rot = ((rawRot % 360 + 360) % 360) as any;
              }

              const pinLen = lenNode ? parseFloat(lenNode[1] as string) || 3.81 : 3.81;
              const pinName = nameNode && typeof nameNode[1] === 'string' ? nameNode[1] : '~';
              const pinNum = numNode && typeof numNode[1] === 'string' ? numNode[1] : `${pins.length + 1}`;

              pins.push({
                id: `pin_${pinNum}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                number: pinNum,
                name: pinName,
                electricalType: electType,
                x: px,
                y: py,
                length: pinLen,
                orientation: rot,
                visible: true,
              });
            } else if (keyword === 'rectangle') {
              // (rectangle (start x1 y1) (end x2 y2) ...)
              const startNode = getSubList(item, 'start');
              const endNode = getSubList(item, 'end');
              if (startNode && endNode) {
                const x1 = parseFloat(startNode[1] as string) || 0;
                const y1 = -(parseFloat(startNode[2] as string) || 0);
                const x2 = parseFloat(endNode[1] as string) || 0;
                const y2 = -(parseFloat(endNode[2] as string) || 0);

                shapes.push({
                  type: 'rectangle',
                  x: (x1 + x2) / 2,
                  y: (y1 + y2) / 2,
                  width: Math.abs(x2 - x1),
                  height: Math.abs(y2 - y1),
                  strokeWidth: 0.25,
                });
              }
            } else if (keyword === 'polyline') {
              // (polyline (pts (xy x y) (xy x y) ...) ...)
              const ptsNode = getSubList(item, 'pts');
              if (ptsNode) {
                const points: Point2D[] = [];
                for (const pt of ptsNode) {
                  if (Array.isArray(pt) && pt[0] === 'xy') {
                    points.push({
                      x: parseFloat(pt[1] as string) || 0,
                      y: -(parseFloat(pt[2] as string) || 0),
                    });
                  }
                }
                if (points.length >= 2) {
                  shapes.push({
                    type: 'line',
                    points,
                    strokeWidth: 0.25,
                  });
                }
              }
            } else if (keyword === 'circle') {
              // (circle (center x y) (radius r) ...)
              const centerNode = getSubList(item, 'center');
              const radNode = getSubList(item, 'radius');
              if (centerNode && radNode) {
                shapes.push({
                  type: 'circle',
                  x: parseFloat(centerNode[1] as string) || 0,
                  y: -(parseFloat(centerNode[2] as string) || 0),
                  radius: parseFloat(radNode[1] as string) || 1.0,
                  strokeWidth: 0.25,
                });
              }
            } else if (keyword === 'arc') {
              // (arc (start x y) (mid x y) (end x y) ...)
              const startNode = getSubList(item, 'start');
              const endNode = getSubList(item, 'end');
              if (startNode && endNode) {
                shapes.push({
                  type: 'arc',
                  x: parseFloat(startNode[1] as string) || 0,
                  y: -(parseFloat(startNode[2] as string) || 0),
                  radius: 2.0,
                  startAngle: 0,
                  endAngle: Math.PI,
                  strokeWidth: 0.25,
                });
              }
            } else if (keyword === 'symbol') {
              // Unit symbol (e.g. Device:R_1_1)
              processSubUnits(item);
            }
          }
        };

        processSubUnits(symNode);

        // Fallback graphical shape if none were parsed
        if (shapes.length === 0 && pins.length > 0) {
          shapes.push({
            type: 'rectangle',
            x: 0,
            y: 0,
            width: 14,
            height: Math.max(14, pins.length * 3.5),
            strokeWidth: 0.25,
          });
        }

        const symbolDef: SymbolDefinition = {
          id: `sym_${libName}_${symName}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: symName,
          library: libName,
          description: description || `Imported symbol ${symName}`,
          keywords: keywords.length > 0 ? keywords : [symName.toLowerCase()],
          category: libName,
          defaultPrefix: reference.replace(/\?$/, '') || 'U',
          defaultFootprint: footprint,
          datasheet,
          pins,
          shapes,
          isPower: symName.startsWith('+') || symName === 'GND' || symName === 'VCC' || symName === 'VDD',
        };

        symbols.push(symbolDef);
      } catch (err: any) {
        warnings.push(`Error parsing symbol node: ${err.message}`);
      }
    }

    return { symbols, warnings, errors };
  }
}

// ==========================================
// 4. KiCad Footprint (.kicad_mod) Parser
// ==========================================

export interface KiCadFootprintParseResult {
  footprints: FootprintDefinition[];
  warnings: string[];
  errors: string[];
}

export class KiCadFootprintParser {
  public static parse(content: string, defaultLibName = 'Imported_Footprints'): KiCadFootprintParseResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const footprints: FootprintDefinition[] = [];

    let ast: SExpr[];
    try {
      ast = SExprParser.parse(content);
    } catch (err: any) {
      errors.push(`S-Expression Parse Error: ${err.message}`);
      return { footprints, warnings, errors };
    }

    if (ast.length === 0) {
      warnings.push('Footprint file contains no valid S-expressions.');
      return { footprints, warnings, errors };
    }

    const rootList = ast[0];
    if (!Array.isArray(rootList)) {
      errors.push('Invalid footprint file structure: expected top-level list.');
      return { footprints, warnings, errors };
    }

    let fpNodes: SExpr[][] = [];
    if (rootList[0] === 'footprint' || rootList[0] === 'module') {
      fpNodes = [rootList];
    } else {
      fpNodes = getAllSubLists(rootList, 'footprint');
      if (fpNodes.length === 0) {
        fpNodes = getAllSubLists(rootList, 'module');
      }
    }

    if (fpNodes.length === 0) {
      errors.push(`Unrecognized footprint keyword '${rootList[0]}'. Expected 'footprint' or 'module'.`);
      return { footprints, warnings, errors };
    }

    for (const fpNode of fpNodes) {
      try {
        const rawName = typeof fpNode[1] === 'string' ? fpNode[1] : 'Unnamed_Footprint';
        const nameParts = rawName.split(':');
        const fpName = nameParts.pop() || rawName;
        const libName = nameParts.length > 0 ? nameParts.join(':') : defaultLibName;

        const descrNode = getSubList(fpNode, 'descr');
        const tagsNode = getSubList(fpNode, 'tags');
        const description = descrNode && typeof descrNode[1] === 'string' ? descrNode[1] : '';
        const tags = tagsNode && typeof tagsNode[1] === 'string' ? tagsNode[1].split(/\s+/) : [];

        const pads: PCBPad[] = [];
        const shapes: FootprintGraphicShape[] = [];
        let isSMD = false;

        // Model 3D Reference
        const modelNode = getSubList(fpNode, 'model');
        let model3DPath = '';
        if (modelNode && typeof modelNode[1] === 'string') {
          model3DPath = modelNode[1];
        }

        // Iterate sub-nodes for pads and graphics
        for (const item of fpNode) {
          if (!Array.isArray(item)) continue;

          const keyword = item[0];

          if (keyword === 'pad') {
            // (pad "NUM" smd/thru_hole rect/roundrect/circle/oval (at x y rot) (size w h) (drill d) (layers ...))
            const padNum = typeof item[1] === 'string' ? item[1] : `${pads.length + 1}`;
            const padTypeStr = typeof item[2] === 'string' ? item[2] : 'smd';
            const padShapeStr = typeof item[3] === 'string' ? item[3] : 'rect';

            const padType: PadType = padTypeStr.includes('thru') || padTypeStr === 'through_hole' ? 'through_hole' : 'smd';
            if (padType === 'smd') isSMD = true;

            const padShape = mapPadShape(padShapeStr);

            const atNode = getSubList(item, 'at');
            const sizeNode = getSubList(item, 'size');
            const drillNode = getSubList(item, 'drill');
            const layersNode = getSubList(item, 'layers');

            const px = atNode ? parseFloat(atNode[1] as string) || 0 : 0;
            const py = atNode ? parseFloat(atNode[2] as string) || 0 : 0;
            const pw = sizeNode ? parseFloat(sizeNode[1] as string) || 1.0 : 1.0;
            const ph = sizeNode ? parseFloat(sizeNode[2] as string) || 1.0 : 1.0;
            const drillDia = drillNode ? parseFloat(drillNode[1] as string) || 0.8 : undefined;

            const layers: PCBLayerId[] = [];
            if (layersNode) {
              for (let i = 1; i < layersNode.length; i++) {
                if (typeof layersNode[i] === 'string') {
                  layers.push(mapLayerName(layersNode[i] as string));
                }
              }
            }
            if (layers.length === 0) {
              layers.push(padType === 'through_hole' ? 'F.Cu' : 'F.Cu');
            }

            pads.push({
              id: `pad_${padNum}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              number: padNum,
              name: padNum,
              type: padType,
              shape: padShape,
              x: px,
              y: py,
              width: pw,
              height: ph,
              drillDiameter: drillDia,
              layers,
            });
          } else if (keyword === 'fp_line') {
            // (fp_line (start x1 y1) (end x2 y2) (layer ...) (stroke (width w)))
            const startNode = getSubList(item, 'start');
            const endNode = getSubList(item, 'end');
            const layerNode = getSubList(item, 'layer');

            if (startNode && endNode) {
              const layer = mapLayerName(layerNode && typeof layerNode[1] === 'string' ? layerNode[1] : 'F.Silkscreen');
              shapes.push({
                type: 'line',
                layer,
                points: [
                  { x: parseFloat(startNode[1] as string) || 0, y: parseFloat(startNode[2] as string) || 0 },
                  { x: parseFloat(endNode[1] as string) || 0, y: parseFloat(endNode[2] as string) || 0 },
                ],
                strokeWidth: 0.15,
              });
            }
          } else if (keyword === 'fp_rect') {
            const startNode = getSubList(item, 'start');
            const endNode = getSubList(item, 'end');
            const layerNode = getSubList(item, 'layer');

            if (startNode && endNode) {
              const x1 = parseFloat(startNode[1] as string) || 0;
              const y1 = parseFloat(startNode[2] as string) || 0;
              const x2 = parseFloat(endNode[1] as string) || 0;
              const y2 = parseFloat(endNode[2] as string) || 0;
              const layer = mapLayerName(layerNode && typeof layerNode[1] === 'string' ? layerNode[1] : 'F.Silkscreen');

              shapes.push({
                type: 'rect',
                layer,
                x: (x1 + x2) / 2,
                y: (y1 + y2) / 2,
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
                strokeWidth: 0.15,
              });
            }
          } else if (keyword === 'fp_circle') {
            const centerNode = getSubList(item, 'center');
            const endNode = getSubList(item, 'end');
            const layerNode = getSubList(item, 'layer');

            if (centerNode && endNode) {
              const cx = parseFloat(centerNode[1] as string) || 0;
              const cy = parseFloat(centerNode[2] as string) || 0;
              const ex = parseFloat(endNode[1] as string) || 0;
              const ey = parseFloat(endNode[2] as string) || 0;
              const radius = Math.hypot(ex - cx, ey - cy);
              const layer = mapLayerName(layerNode && typeof layerNode[1] === 'string' ? layerNode[1] : 'F.Silkscreen');

              shapes.push({
                type: 'circle',
                layer,
                x: cx,
                y: cy,
                radius,
                strokeWidth: 0.15,
              });
            }
          }
        }

        // Calculate Courtyard Bounds from pads or shapes
        let minX = -1.5, maxX = 1.5, minY = -1.5, maxY = 1.5;
        if (pads.length > 0) {
          minX = Infinity;
          maxX = -Infinity;
          minY = Infinity;
          maxY = -Infinity;
          pads.forEach((p) => {
            const hw = p.width / 2 + 0.3;
            const hh = p.height / 2 + 0.3;
            if (p.x - hw < minX) minX = p.x - hw;
            if (p.x + hw > maxX) maxX = p.x + hw;
            if (p.y - hh < minY) minY = p.y - hh;
            if (p.y + hh > maxY) maxY = p.y + hh;
          });
        }

        const footprintDef: FootprintDefinition = {
          id: `${libName}:${fpName}`,
          name: fpName,
          library: libName,
          description: description || `Imported footprint ${fpName}`,
          keywords: tags.length > 0 ? tags : [fpName.toLowerCase()],
          category: libName,
          pads,
          shapes,
          courtyard: { minX, maxX, minY, maxY },
          isSMD,
          model3D: model3DPath
            ? {
                modelPath: model3DPath,
                packageType: fpName,
                offsetX: 0,
                offsetY: 0,
                offsetZ: 0.5,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scaleX: 1,
                scaleY: 1,
                scaleZ: 1,
              }
            : undefined,
        };

        footprints.push(footprintDef);
      } catch (err: any) {
        warnings.push(`Error parsing footprint node: ${err.message}`);
      }
    }

    return { footprints, warnings, errors };
  }
}

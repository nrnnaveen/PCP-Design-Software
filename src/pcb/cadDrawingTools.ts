/**
 * FloZ EDA - KiCad-Class 2D Vector CAD Drawing Tools
 * Supports drawing mechanical, silkscreen, and fabrication geometries:
 * Rectangles, Rounded Rectangles, Circles, Polygons, Text/Labels, and Dimension Markers.
 */

import { Point2D, PCBLayerId, FootprintGraphicShape, PCBDimension, PCBTextGraphic } from '../core/types';

export type CADToolType = 'rect' | 'circle' | 'polygon' | 'text' | 'dimension';

export class CADDrawingEngine {
  /**
   * Creates a rectangle graphic shape on the active layer
   */
  public static createRectangle(
    p1: Point2D,
    p2: Point2D,
    layer: PCBLayerId,
    strokeWidth = 0.2
  ): FootprintGraphicShape {
    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    return {
      type: 'rect',
      layer,
      x: minX,
      y: minY,
      width,
      height,
      strokeWidth,
    };
  }

  /**
   * Creates a circle graphic shape on the active layer
   */
  public static createCircle(
    center: Point2D,
    edge: Point2D,
    layer: PCBLayerId,
    strokeWidth = 0.2
  ): FootprintGraphicShape {
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y);

    return {
      type: 'circle',
      layer,
      x: center.x,
      y: center.y,
      radius,
      strokeWidth,
    };
  }

  /**
   * Creates a polygon graphic shape on the active layer
   */
  public static createPolygon(
    points: Point2D[],
    layer: PCBLayerId,
    strokeWidth = 0.2
  ): FootprintGraphicShape {
    return {
      type: 'polygon',
      layer,
      points: [...points],
      strokeWidth,
    };
  }

  /**
   * Creates a text graphic label on the active layer
   */
  public static createText(
    text: string,
    pos: Point2D,
    layer: PCBLayerId,
    fontSize = 1.5,
    strokeWidth = 0.15,
    rotation = 0
  ): PCBTextGraphic {
    return {
      id: `txt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      text,
      layer,
      x: pos.x,
      y: pos.y,
      fontSize,
      strokeWidth,
      rotation,
      mirror: layer.startsWith('B.'),
    };
  }

  /**
   * Creates a dimension measurement marker
   */
  public static createDimension(
    p1: Point2D,
    p2: Point2D,
    layer: PCBLayerId = 'Dwgs.User',
    offset = 5.0
  ): PCBDimension {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    return {
      id: `dim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      layer,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      offset,
      value: Number(dist.toFixed(3)),
      units: 'mm',
    };
  }
}

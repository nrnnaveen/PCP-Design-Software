/**
 * FloZ EDA - Homogeneous 2D Affine Transformation Matrix
 * Provides high-precision world <-> screen coordinate transforms, DPI scaling, and transform matrix caching.
 *
 * Matrix Representation:
 * | a   c   tx |   | x |   | a*x + c*y + tx |
 * | b   d   ty | * | y | = | b*x + d*y + ty |
 * | 0   0   1  |   | 1 |   | 1              |
 */

import { Point2D, BoundingBox2D } from './types';

export class AffineTransform2D {
  public a: number;
  public b: number;
  public c: number;
  public d: number;
  public tx: number;
  public ty: number;

  constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }

  /**
   * Creates a translation + isotropic scale transformation matrix
   * @param panX Screen offset X in CSS pixels
   * @param panY Screen offset Y in CSS pixels
   * @param zoom Zoom factor (pixels per world millimeter)
   * @param dpr Device pixel ratio (default 1)
   */
  public static fromPanZoom(panX: number, panY: number, zoom: number, dpr = 1): AffineTransform2D {
    return new AffineTransform2D(
      zoom * dpr,
      0,
      0,
      zoom * dpr,
      panX * dpr,
      panY * dpr
    );
  }

  /**
   * Transforms a world point to screen/device coordinates
   */
  public worldToScreen(wx: number, wy: number): Point2D {
    return {
      x: this.a * wx + this.c * wy + this.tx,
      y: this.b * wx + this.d * wy + this.ty,
    };
  }

  /**
   * Inverts the transformation to map screen/device coordinates back to world coordinates
   */
  public screenToWorld(sx: number, sy: number): Point2D {
    const det = this.a * this.d - this.b * this.c;
    if (Math.abs(det) < 1e-12) {
      return { x: 0, y: 0 };
    }

    const invA = this.d / det;
    const invB = -this.b / det;
    const invC = -this.c / det;
    const invD = this.a / det;
    const invTx = (this.c * this.ty - this.d * this.tx) / det;
    const invTy = (this.b * this.tx - this.a * this.ty) / det;

    return {
      x: invA * sx + invC * sy + invTx,
      y: invB * sx + invD * sy + invTy,
    };
  }

  /**
   * Transforms a bounding box from world to screen coordinates
   */
  public transformBox(box: BoundingBox2D): BoundingBox2D {
    const p1 = this.worldToScreen(box.minX, box.minY);
    const p2 = this.worldToScreen(box.maxX, box.maxY);
    return {
      minX: Math.min(p1.x, p2.x),
      minY: Math.min(p1.y, p2.y),
      maxX: Math.max(p1.x, p2.x),
      maxY: Math.max(p1.y, p2.y),
    };
  }

  /**
   * Applies this matrix to an HTML5 Canvas 2D Rendering Context
   */
  public applyToContext(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.a, this.b, this.c, this.d, this.tx, this.ty);
  }
}

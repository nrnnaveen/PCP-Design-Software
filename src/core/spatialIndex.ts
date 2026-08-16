/**
 * Apex EDA - Spatial Index Engine
 * High-performance 2D Bounding Volume Hierarchy / Spatial Grid for CAD primitives.
 */

import { BoundingBox2D, Point2D } from './types';

export interface SpatialItem<T> {
  id: string;
  bounds: BoundingBox2D;
  data: T;
}

export class SpatialIndex<T> {
  private items: Map<string, SpatialItem<T>> = new Map();
  private cellSize: number;
  private grid: Map<string, Set<string>> = new Map();

  constructor(cellSize: number = 5.0) {
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx}:${cy}`;
  }

  private getOverlappingCells(bounds: BoundingBox2D): string[] {
    const minCx = Math.floor(bounds.minX / this.cellSize);
    const maxCx = Math.floor(bounds.maxX / this.cellSize);
    const minCy = Math.floor(bounds.minY / this.cellSize);
    const maxCy = Math.floor(bounds.maxY / this.cellSize);

    const keys: string[] = [];
    for (let x = minCx; x <= maxCx; x++) {
      for (let y = minCy; y <= maxCy; y++) {
        keys.push(`${x}:${y}`);
      }
    }
    return keys;
  }

  public insert(id: string, bounds: BoundingBox2D, data: T): void {
    if (this.items.has(id)) {
      this.remove(id);
    }

    const item: SpatialItem<T> = { id, bounds, data };
    this.items.set(id, item);

    const cells = this.getOverlappingCells(bounds);
    cells.forEach((key) => {
      if (!this.grid.has(key)) {
        this.grid.set(key, new Set());
      }
      this.grid.get(key)!.add(id);
    });
  }

  public remove(id: string): void {
    const item = this.items.get(id);
    if (!item) return;

    const cells = this.getOverlappingCells(item.bounds);
    cells.forEach((key) => {
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) {
          this.grid.delete(key);
        }
      }
    });
    this.items.delete(id);
  }

  public clear(): void {
    this.items.clear();
    this.grid.clear();
  }

  public queryBox(box: BoundingBox2D): SpatialItem<T>[] {
    const cells = this.getOverlappingCells(box);
    const candidateIds = new Set<string>();

    cells.forEach((key) => {
      const cell = this.grid.get(key);
      if (cell) {
        cell.forEach((id) => candidateIds.add(id));
      }
    });

    const results: SpatialItem<T>[] = [];
    candidateIds.forEach((id) => {
      const item = this.items.get(id);
      if (item && this.intersects(item.bounds, box)) {
        results.push(item);
      }
    });

    return results;
  }

  public queryPoint(p: Point2D, radius: number = 0.5): SpatialItem<T>[] {
    const box: BoundingBox2D = {
      minX: p.x - radius,
      minY: p.y - radius,
      maxX: p.x + radius,
      maxY: p.y + radius,
    };
    return this.queryBox(box);
  }

  private intersects(a: BoundingBox2D, b: BoundingBox2D): boolean {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  }

  public getAll(): SpatialItem<T>[] {
    return Array.from(this.items.values());
  }

  public size(): number {
    return this.items.size;
  }
}

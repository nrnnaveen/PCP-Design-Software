import { describe, it, expect } from 'vitest';
import { createDemoProject } from '../examples/demoProject';
import { ProjectSerializer } from '../core/serialization';
import { TransactionManager } from '../core/transaction';
import { SpatialIndex } from '../core/spatialIndex';

describe('Apex EDA Core Subsystem Tests', () => {
  it('should serialize and deserialize a project deterministically', () => {
    const demo = createDemoProject();
    const serialized = ProjectSerializer.serialize(demo);
    expect(serialized).toContain('FloZ MCU Reference Board');

    const deserialized = ProjectSerializer.deserialize(serialized);
    expect(deserialized.metadata.name).toBe('FloZ MCU Reference Board');
    expect(deserialized.pcb.footprints.length).toBe(demo.pcb.footprints.length);
    expect(deserialized.schematic.sheets[0].symbols.length).toBe(
      demo.schematic.sheets[0].symbols.length
    );
  });

  it('should handle undo and redo state transactions accurately', () => {
    const mgr = new TransactionManager<{ count: number }>();
    let state = { count: 0 };

    const incAction = {
      name: 'Increment',
      apply: (s: { count: number }) => ({ count: s.count + 1 }),
      invert: (s: { count: number }) => ({ count: s.count - 1 }),
    };

    state = mgr.execute(state, incAction);
    expect(state.count).toBe(1);
    expect(mgr.canUndo()).toBe(true);

    const { state: undone } = mgr.undo(state);
    expect(undone.count).toBe(0);
    expect(mgr.canRedo()).toBe(true);

    const { state: redone } = mgr.redo(undone);
    expect(redone.count).toBe(1);
  });

  it('should correctly index and query bounding boxes with SpatialIndex', () => {
    const index = new SpatialIndex<string>(5.0);
    index.insert('item1', { minX: 0, minY: 0, maxX: 10, maxY: 10 }, 'U1');
    index.insert('item2', { minX: 50, minY: 50, maxX: 60, maxY: 60 }, 'U2');

    const query1 = index.queryPoint({ x: 5, y: 5 }, 1.0);
    expect(query1.length).toBe(1);
    expect(query1[0].data).toBe('U1');

    const query2 = index.queryPoint({ x: 90, y: 90 }, 1.0);
    expect(query2.length).toBe(0);
  });
});

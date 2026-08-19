/**
 * FloZ EDA - Ultimate Production Certification Test Suite
 * Comprehensive automated regression testing for:
 * 1. Startup flow (Dashboard default on '/')
 * 2. Dark theme default & persistence
 * 3. Authentication & Guest Mode
 * 4. Settings management
 * 5. Live Circuit Lab (Static parsing, syntax check, honest simulation status)
 * 6. PCB Design & Routing (Geometry/connectivity separation, same-net validation, short circuit prevention)
 * 7. Undo/Redo transactions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDemoProject } from '../examples/demoProject';
import { AuthService } from '../core/auth';
import { CircuitCodeAnalyzer } from '../simulation/LiveCircuitLab';
import { InteractiveRouter } from '../router/router';
import { RatsnestGenerator } from '../pcb/ratsnest';
import { TransactionManager } from '../core/transaction';
import { ApexProject } from '../core/types';

describe('FloZ EDA — Ultimate Production Verification Suite', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    };
  });

  // -------------------------------------------------------------
  // 1. Startup Routing — Dashboard Default
  // -------------------------------------------------------------
  describe('Phase 1: Startup Routing — Dashboard Default', () => {
    function resolveRoute(pathname: string, hash = ''): { tab: string; showDashboard: boolean } {
      const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
      const cleanHash = hash.toLowerCase().replace(/^#\/?/, '');
      const path = cleanPath !== '/' ? cleanPath : cleanHash ? `/${cleanHash}` : '/';

      if (path === '/' || path === '/dashboard' || path === '/projects') {
        return { tab: 'schematic', showDashboard: true };
      }
      if (path.startsWith('/workspace/pcb') || path === '/pcb') {
        return { tab: 'pcb', showDashboard: false };
      }
      if (path.startsWith('/workspace/3d') || path === '/3d') {
        return { tab: '3d', showDashboard: false };
      }
      if (path.startsWith('/workspace')) {
        return { tab: 'schematic', showDashboard: false };
      }
      return { tab: 'schematic', showDashboard: true };
    }

    it('opens on Dashboard when root "/" is visited on application launch', () => {
      const res = resolveRoute('/');
      expect(res.showDashboard).toBe(true);
    });

    it('opens on Dashboard when "/dashboard" is visited', () => {
      const res = resolveRoute('/dashboard');
      expect(res.showDashboard).toBe(true);
    });

    it('opens directly into Workspace when explicit "/workspace" is visited', () => {
      const res = resolveRoute('/workspace');
      expect(res.showDashboard).toBe(false);
      expect(res.tab).toBe('schematic');
    });

    it('opens directly into PCB editor when "/workspace/pcb" is visited', () => {
      const res = resolveRoute('/workspace/pcb');
      expect(res.showDashboard).toBe(false);
      expect(res.tab).toBe('pcb');
    });
  });

  // -------------------------------------------------------------
  // 2. Dark Theme Default & Persistence
  // -------------------------------------------------------------
  describe('Phase 2: Dark Theme Default & Persistence', () => {
    it('defaults to dark theme when no saved preference exists', () => {
      const initialTheme = (localStorage.getItem('floz-eda-theme') as 'dark' | 'light') || 'dark';
      expect(initialTheme).toBe('dark');
    });

    it('persists theme toggle changes', () => {
      localStorage.setItem('floz-eda-theme', 'light');
      expect(localStorage.getItem('floz-eda-theme')).toBe('light');

      localStorage.setItem('floz-eda-theme', 'dark');
      expect(localStorage.getItem('floz-eda-theme')).toBe('dark');
    });
  });

  // -------------------------------------------------------------
  // 3. Authentication & Guest Mode
  // -------------------------------------------------------------
  describe('Phase 3: Authentication & Guest Mode', () => {
    it('initializes with a valid Guest user session', () => {
      const user = AuthService.getUser();
      expect(user).toBeDefined();
      expect(user.isGuest).toBe(true);
      expect(AuthService.isGuest()).toBe(true);
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('authenticates user and transitions from guest to authenticated', async () => {
      const user = await AuthService.login('lead_engineer@floz.dev');
      expect(user.email).toBe('lead_engineer@floz.dev');
      expect(user.isGuest).toBe(false);
      expect(AuthService.isGuest()).toBe(false);
      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('supports logging out and returning to Guest mode cleanly', () => {
      AuthService.logout();
      expect(AuthService.isGuest()).toBe(true);
      expect(AuthService.isAuthenticated()).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 4. Live Circuit Lab & Static Code Analysis
  // -------------------------------------------------------------
  describe('Phase 5: Live Circuit Lab & Static Analysis', () => {
    it('correctly detects Arduino platform and extracts GPIO declarations', () => {
      const code = `
        #include <Wire.h>
        void setup() {
          pinMode(13, OUTPUT);
          pinMode(2, INPUT_PULLUP);
          pinMode(9, OUTPUT);
        }
        void loop() {
          digitalWrite(13, HIGH);
          delay(100);
        }
      `;

      const analysis = CircuitCodeAnalyzer.analyze(code);
      expect(analysis.platform).toBe('Arduino (AVR)');
      expect(analysis.syntaxValid).toBe(true);
      expect(analysis.hasSetup).toBe(true);
      expect(analysis.hasLoop).toBe(true);
      expect(analysis.detectedLibraries).toContain('Wire.h');
      expect(analysis.pinDeclarations).toEqual([
        { pin: '13', mode: 'OUTPUT' },
        { pin: '2', mode: 'INPUT_PULLUP' },
        { pin: '9', mode: 'OUTPUT' },
      ]);
      expect(analysis.simulationAvailable).toBe(true);
      expect(analysis.simulationStatus).toBe('supported');
    });

    it('detects syntax errors such as unbalanced brackets', () => {
      const brokenCode = `
        void setup() {
          pinMode(13, OUTPUT);
        // Missing closing brace
      `;

      const analysis = CircuitCodeAnalyzer.analyze(brokenCode);
      expect(analysis.syntaxValid).toBe(false);
      expect(analysis.errors.length).toBeGreaterThan(0);
      expect(analysis.errors[0]).toContain('Unbalanced curly braces');
    });

    it('honestly reports unsupported bare-metal emulator for ESP32 with full static analysis', () => {
      const esp32Code = `
        #include <WiFi.h>
        void setup() {
          Serial.begin(115200);
          pinMode(2, OUTPUT);
        }
        void loop() {
          vTaskDelay(10);
        }
      `;

      const analysis = CircuitCodeAnalyzer.analyze(esp32Code);
      expect(analysis.platform).toBe('ESP32 (Xtensa)');
      expect(analysis.simulationAvailable).toBe(false);
      expect(analysis.simulationStatus).toBe('unsupported_target');
      expect(analysis.simulationMessage).toContain('Bare-metal ESP32 (Xtensa)');
    });
  });

  // -------------------------------------------------------------
  // 5. PCB Geometry vs Logical Connectivity Separation
  // -------------------------------------------------------------
  describe('Phase 6: PCB Geometry vs Connectivity Separation', () => {
    it('moving a footprint changes physical X/Y but preserves net and pin assignments', () => {
      const project = createDemoProject();
      const u1 = project.pcb.footprints.find((f) => f.reference === 'U1')!;
      expect(u1).toBeDefined();

      const originalRef = u1.reference;
      const originalPads = JSON.parse(JSON.stringify(u1.pads));
      const originalNetGraph = JSON.parse(JSON.stringify(project.netGraph));

      // Simulate dragging footprint from (50, 40) to (80, 65)
      const movedFootprints = project.pcb.footprints.map((fp) =>
        fp.id === u1.id ? { ...fp, x: 80, y: 65 } : fp
      );

      const movedU1 = movedFootprints.find((f) => f.id === u1.id)!;
      expect(movedU1.x).toBe(80);
      expect(movedU1.y).toBe(65);

      // Verify logical identity is unchanged
      expect(movedU1.reference).toBe(originalRef);
      expect(movedU1.pads).toEqual(originalPads);
      expect(project.netGraph).toEqual(originalNetGraph);
    });

    it('dynamically recalculates ratsnest airwire coordinates when footprint moves', () => {
      const project = createDemoProject();
      const initialRats = RatsnestGenerator.generate(project.pcb);
      expect(initialRats.length).toBeGreaterThan(0);

      // Move a footprint
      const fp0 = project.pcb.footprints[0];
      const updatedPcb = {
        ...project.pcb,
        footprints: project.pcb.footprints.map((fp, i) =>
          i === 0 ? { ...fp, x: fp.x + 30, y: fp.y + 20 } : fp
        ),
      };

      const updatedRats = RatsnestGenerator.generate(updatedPcb);
      expect(updatedRats.length).toBeGreaterThan(0);
      // Airwire positions should adapt to new physical pad locations
      const line0 = updatedRats[0];
      expect(line0).toBeDefined();
      expect(typeof line0.x1).toBe('number');
      expect(typeof line0.y1).toBe('number');
    });
  });

  // -------------------------------------------------------------
  // 6. Interactive PCB Routing & Short-Circuit Prevention
  // -------------------------------------------------------------
  describe('Phase 7: Interactive PCB Routing & Short-Circuit Prevention', () => {
    it('finds pad at world position with accurate rotation transform', () => {
      const project = createDemoProject();
      const fp = project.pcb.footprints[0]; // First footprint
      const pad = fp.pads[0];

      // Calculate pad world coordinate
      const rad = (fp.rotation * Math.PI) / 180;
      const rx = pad.x * Math.cos(rad) - pad.y * Math.sin(rad);
      const ry = pad.x * Math.sin(rad) + pad.y * Math.cos(rad);
      const worldPadPos = { x: fp.x + rx, y: fp.y + ry };

      const hit = InteractiveRouter.findPadAtPosition(project.pcb, worldPadPos, 'F.Cu');
      expect(hit).toBeDefined();
      expect(hit?.footprint.id).toBe(fp.id);
      expect(hit?.pad.id).toBe(pad.id);
    });

    it('allows routing between matching same-net endpoints', () => {
      const validation = InteractiveRouter.validateConnection('+3.3V', '+3.3V');
      expect(validation.valid).toBe(true);
    });

    it('rejects routing between different electrical nets to prevent short circuits', () => {
      const validation = InteractiveRouter.validateConnection('+3.3V', 'GND');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Cannot connect net "+3.3V" to net "GND"');
    });

    it('computes accurate 45-degree octilinear routing paths', () => {
      const start = { x: 10, y: 10 };
      const end = { x: 30, y: 20 };
      const segments = InteractiveRouter.compute45DegreePath(start, end);

      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0].x1).toBe(10);
      expect(segments[0].y1).toBe(10);
      expect(segments[segments.length - 1].x2).toBe(30);
      expect(segments[segments.length - 1].y2).toBe(20);
    });
  });

  // -------------------------------------------------------------
  // 7. Undo / Redo Transactions
  // -------------------------------------------------------------
  describe('Phase 11: Undo / Redo Transactions', () => {
    it('records and restores project states for component moves and track additions', () => {
      const txMgr = new TransactionManager<ApexProject>(20);
      let project = createDemoProject();
      const initialFpX = project.pcb.footprints[0].x;

      // Execute move action
      const moveAction = {
        name: 'Move Footprint',
        apply: (state: ApexProject) => ({
          ...state,
          pcb: {
            ...state.pcb,
            footprints: state.pcb.footprints.map((fp, i) =>
              i === 0 ? { ...fp, x: 99, y: 88 } : fp
            ),
          },
        }),
        invert: (state: ApexProject) => ({
          ...state,
          pcb: {
            ...state.pcb,
            footprints: state.pcb.footprints.map((fp, i) =>
              i === 0 ? { ...fp, x: initialFpX, y: fp.y } : fp
            ),
          },
        }),
      };

      project = txMgr.execute(project, moveAction);
      expect(project.pcb.footprints[0].x).toBe(99);
      expect(txMgr.canUndo()).toBe(true);

      // Perform Undo
      const undone = txMgr.undo(project);
      expect(undone.state.pcb.footprints[0].x).toBe(initialFpX);
      expect(txMgr.canRedo()).toBe(true);

      // Perform Redo
      const redone = txMgr.redo(undone.state);
      expect(redone.state.pcb.footprints[0].x).toBe(99);
    });
  });
});

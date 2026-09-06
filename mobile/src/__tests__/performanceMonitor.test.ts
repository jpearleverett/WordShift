import {
  startFrameMonitoring,
  stopFrameMonitoring,
  markRenderStart,
  recordGenerationMetric,
  getPerformanceSummary,
  isPerformanceDegraded,
  clearMetrics,
} from '../services/performanceMonitor';

// Mock requestAnimationFrame / cancelAnimationFrame for Node
let rafCallbacks: ((time: number) => void)[] = [];
let rafId = 0;

beforeAll(() => {
  (global as any).requestAnimationFrame = (cb: (time: number) => void) => {
    rafCallbacks.push(cb);
    return ++rafId;
  };
  (global as any).cancelAnimationFrame = (_id: number) => {
    rafCallbacks = [];
  };
  (global as any).performance = {
    now: jest.fn(() => Date.now()),
  };
});

beforeEach(() => {
  stopFrameMonitoring();
  clearMetrics();
  rafCallbacks = [];
  rafId = 0;
});

describe('clearMetrics', () => {
  test('resets all metrics to empty', () => {
    recordGenerationMetric({
      difficulty: 'EASY',
      duration: 500,
      candidatesGenerated: 3,
      bestScore: 60,
      usedFallback: false,
    });
    clearMetrics();
    const summary = getPerformanceSummary();
    expect(summary.puzzleGeneration.totalGenerated).toBe(0);
    expect(summary.renders.totalSamples).toBe(0);
    expect(summary.fps.totalSamples).toBe(0);
  });
});

describe('getPerformanceSummary', () => {
  test('returns defaults when no metrics collected', () => {
    const summary = getPerformanceSummary();
    expect(summary.fps.average).toBe(60);
    expect(summary.fps.min).toBe(60);
    expect(summary.fps.p95).toBe(60);
    expect(summary.fps.droppedFrames).toBe(0);
    expect(summary.fps.totalSamples).toBe(0);
    expect(summary.renders.averageDuration).toBe(0);
    expect(summary.renders.maxDuration).toBe(0);
    expect(summary.renders.slowRenders).toBe(0);
    expect(summary.renders.totalSamples).toBe(0);
    expect(summary.renders.byComponent).toEqual({});
    expect(summary.puzzleGeneration.averageDuration).toBe(0);
    expect(summary.puzzleGeneration.totalGenerated).toBe(0);
  });
});

describe('markRenderStart', () => {
  test('records render duration for a component', () => {
    let now = 1000;
    (performance.now as jest.Mock).mockImplementation(() => now);

    const end = markRenderStart('LetterTile');
    now = 1010; // 10ms later
    end();

    const summary = getPerformanceSummary();
    expect(summary.renders.totalSamples).toBe(1);
    expect(summary.renders.averageDuration).toBe(10);
    expect(summary.renders.byComponent['LetterTile']).toBeDefined();
    expect(summary.renders.byComponent['LetterTile'].count).toBe(1);
    expect(summary.renders.byComponent['LetterTile'].avg).toBe(10);
  });

  test('tracks multiple components separately', () => {
    let now = 1000;
    (performance.now as jest.Mock).mockImplementation(() => now);

    const end1 = markRenderStart('LetterTile');
    now = 1005;
    end1();

    const end2 = markRenderStart('Row');
    now = 1025;
    end2();

    const summary = getPerformanceSummary();
    expect(summary.renders.totalSamples).toBe(2);
    expect(summary.renders.byComponent['LetterTile'].avg).toBe(5);
    expect(summary.renders.byComponent['Row'].avg).toBe(20);
  });

  test('counts slow renders (>16ms)', () => {
    let now = 1000;
    (performance.now as jest.Mock).mockImplementation(() => now);

    // Fast render (5ms)
    const end1 = markRenderStart('Fast');
    now = 1005;
    end1();

    // Slow render (25ms)
    const end2 = markRenderStart('Slow');
    now = 1030;
    end2();

    const summary = getPerformanceSummary();
    expect(summary.renders.slowRenders).toBe(1);
  });
});

describe('recordGenerationMetric', () => {
  test('records a single generation metric', () => {
    recordGenerationMetric({
      difficulty: 'MEDIUM',
      duration: 1200,
      candidatesGenerated: 3,
      bestScore: 72,
      usedFallback: false,
    });

    const summary = getPerformanceSummary();
    expect(summary.puzzleGeneration.totalGenerated).toBe(1);
    expect(summary.puzzleGeneration.averageDuration).toBe(1200);
    expect(summary.puzzleGeneration.averageScore).toBe(72);
    expect(summary.puzzleGeneration.timeouts).toBe(0);
    expect(summary.puzzleGeneration.fallbacks).toBe(0);
  });

  test('tracks timeouts (duration >= 2500ms)', () => {
    recordGenerationMetric({
      difficulty: 'HARD',
      duration: 2600,
      candidatesGenerated: 0,
      bestScore: 0,
      usedFallback: true,
    });

    const summary = getPerformanceSummary();
    expect(summary.puzzleGeneration.timeouts).toBe(1);
    expect(summary.puzzleGeneration.fallbacks).toBe(1);
  });

  test('computes averages over multiple generations', () => {
    recordGenerationMetric({
      difficulty: 'EASY',
      duration: 500,
      candidatesGenerated: 3,
      bestScore: 60,
      usedFallback: false,
    });
    recordGenerationMetric({
      difficulty: 'HARD',
      duration: 1500,
      candidatesGenerated: 3,
      bestScore: 80,
      usedFallback: false,
    });

    const summary = getPerformanceSummary();
    expect(summary.puzzleGeneration.totalGenerated).toBe(2);
    expect(summary.puzzleGeneration.averageDuration).toBe(1000);
    expect(summary.puzzleGeneration.averageScore).toBe(70);
  });

  test('caps stored metrics to prevent memory growth', () => {
    for (let i = 0; i < 60; i++) {
      recordGenerationMetric({
        difficulty: 'EASY',
        duration: 100 + i,
        candidatesGenerated: 1,
        bestScore: 50,
        usedFallback: false,
      });
    }
    const summary = getPerformanceSummary();
    // MAX_GENERATION_SAMPLES = 50
    expect(summary.puzzleGeneration.totalGenerated).toBe(50);
  });
});

describe('startFrameMonitoring / stopFrameMonitoring', () => {
  test('starts and records frame metrics via rAF', () => {
    let now = 0;
    (performance.now as jest.Mock).mockImplementation(() => now);

    startFrameMonitoring();

    // Simulate several frames at 60fps (~16.67ms each)
    for (let i = 1; i <= 5; i++) {
      now = i * 16.67;
      // Flush rAF callback
      const cbs = [...rafCallbacks];
      rafCallbacks = [];
      cbs.forEach(cb => cb(now));
    }

    stopFrameMonitoring();

    const summary = getPerformanceSummary();
    // First rAF establishes lastFrameTime baseline, so 5 callbacks = 4 measured frames
    expect(summary.fps.totalSamples).toBe(4);
    expect(summary.fps.average).toBeGreaterThanOrEqual(55);
    expect(summary.fps.droppedFrames).toBe(0);
  });

  test('detects dropped frames', () => {
    let now = 0;
    (performance.now as jest.Mock).mockImplementation(() => now);

    startFrameMonitoring();

    // Normal frame
    now = 16;
    let cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach(cb => cb(now));

    // Dropped frame (50ms gap)
    now = 66;
    cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach(cb => cb(now));

    stopFrameMonitoring();

    const summary = getPerformanceSummary();
    expect(summary.fps.droppedFrames).toBe(1);
  });

  test('prevents double start', () => {
    startFrameMonitoring();
    const callbackCount1 = rafCallbacks.length;
    startFrameMonitoring(); // should be no-op
    expect(rafCallbacks.length).toBe(callbackCount1);
    stopFrameMonitoring();
  });
});

describe('isPerformanceDegraded', () => {
  test('returns false with insufficient data', () => {
    expect(isPerformanceDegraded()).toBe(false);
  });

  test('returns false with good frame rate', () => {
    let now = 0;
    (performance.now as jest.Mock).mockImplementation(() => now);

    startFrameMonitoring();
    // Simulate 60 frames at 60fps
    for (let i = 1; i <= 60; i++) {
      now = i * 16.67;
      const cbs = [...rafCallbacks];
      rafCallbacks = [];
      cbs.forEach(cb => cb(now));
    }
    stopFrameMonitoring();

    expect(isPerformanceDegraded()).toBe(false);
  });

  test('returns true when fps drops below 45', () => {
    let now = 0;
    (performance.now as jest.Mock).mockImplementation(() => now);

    startFrameMonitoring();
    // Simulate 60 frames at ~30fps (33ms per frame)
    for (let i = 1; i <= 60; i++) {
      now = i * 33;
      const cbs = [...rafCallbacks];
      rafCallbacks = [];
      cbs.forEach(cb => cb(now));
    }
    stopFrameMonitoring();

    expect(isPerformanceDegraded()).toBe(true);
  });
});

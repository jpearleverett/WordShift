/**
 * Performance monitoring service for tracking animation frame rates,
 * render times, and puzzle generation performance.
 *
 * Collects metrics in-memory and provides summary statistics.
 * Designed for easy integration with external analytics services.
 */

// ============================================================================
// Types
// ============================================================================

export interface FrameMetric {
  timestamp: number;
  duration: number; // ms per frame
}

export interface RenderMetric {
  component: string;
  timestamp: number;
  duration: number; // ms
}

export interface GenerationMetric {
  difficulty: string;
  timestamp: number;
  duration: number; // ms
  candidatesGenerated: number;
  bestScore: number;
  usedFallback: boolean;
}

export interface PerformanceSummary {
  fps: {
    average: number;
    min: number;
    p95: number;
    droppedFrames: number;
    totalSamples: number;
  };
  renders: {
    averageDuration: number;
    maxDuration: number;
    slowRenders: number; // > 16ms
    totalSamples: number;
    byComponent: Record<string, { avg: number; max: number; count: number }>;
  };
  puzzleGeneration: {
    averageDuration: number;
    maxDuration: number;
    timeouts: number;
    fallbacks: number;
    totalGenerated: number;
    averageScore: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const MAX_FRAME_SAMPLES = 300; // ~5 seconds at 60fps
const MAX_RENDER_SAMPLES = 200;
const MAX_GENERATION_SAMPLES = 50;
const DROPPED_FRAME_THRESHOLD = 20; // ms (< 50fps)
const SLOW_RENDER_THRESHOLD = 16; // ms (one frame budget at 60fps)

// ============================================================================
// State
// ============================================================================

let frameMetrics: FrameMetric[] = [];
let renderMetrics: RenderMetric[] = [];
let generationMetrics: GenerationMetric[] = [];
let isMonitoring = false;
let frameCallback: number | null = null;
let lastFrameTime = 0;

// ============================================================================
// Frame Rate Monitoring
// ============================================================================

/**
 * Start monitoring frame rate using requestAnimationFrame.
 * Call this once when the app starts or when entering a performance-critical screen.
 */
export function startFrameMonitoring(): void {
  if (isMonitoring) return;
  isMonitoring = true;
  lastFrameTime = performance.now();
  scheduleFrame();
}

/**
 * Stop monitoring frame rate.
 */
export function stopFrameMonitoring(): void {
  isMonitoring = false;
  if (frameCallback !== null) {
    cancelAnimationFrame(frameCallback);
    frameCallback = null;
  }
}

function scheduleFrame(): void {
  if (!isMonitoring) return;
  frameCallback = requestAnimationFrame((now) => {
    if (lastFrameTime > 0) {
      const duration = now - lastFrameTime;
      frameMetrics.push({ timestamp: now, duration });
      if (frameMetrics.length > MAX_FRAME_SAMPLES) {
        frameMetrics = frameMetrics.slice(-MAX_FRAME_SAMPLES);
      }
    }
    lastFrameTime = now;
    scheduleFrame();
  });
}

// ============================================================================
// Render Timing
// ============================================================================

/**
 * Record a component render duration.
 * Use at the start/end of expensive render functions or in useEffect.
 *
 * Example usage:
 *   const end = markRenderStart('LetterTile');
 *   // ... render logic ...
 *   end();
 */
export function markRenderStart(component: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    renderMetrics.push({ component, timestamp: start, duration });
    if (renderMetrics.length > MAX_RENDER_SAMPLES) {
      renderMetrics = renderMetrics.slice(-MAX_RENDER_SAMPLES);
    }
  };
}

// ============================================================================
// Puzzle Generation Timing
// ============================================================================

/**
 * Record puzzle generation metrics.
 * Called by the puzzle generator after completing (or timing out).
 */
export function recordGenerationMetric(metric: Omit<GenerationMetric, 'timestamp'>): void {
  generationMetrics.push({ ...metric, timestamp: Date.now() });
  if (generationMetrics.length > MAX_GENERATION_SAMPLES) {
    generationMetrics = generationMetrics.slice(-MAX_GENERATION_SAMPLES);
  }
}

// ============================================================================
// Summary
// ============================================================================

/**
 * Get a summary of all collected performance metrics.
 */
export function getPerformanceSummary(): PerformanceSummary {
  // FPS summary
  const fpsDurations = frameMetrics.map(m => m.duration);
  const droppedFrames = fpsDurations.filter(d => d > DROPPED_FRAME_THRESHOLD).length;
  const sortedDurations = [...fpsDurations].sort((a, b) => a - b);
  const avgFrameDuration = fpsDurations.length > 0
    ? fpsDurations.reduce((a, b) => a + b, 0) / fpsDurations.length
    : 16.67;
  const p95Duration = sortedDurations.length > 0
    ? sortedDurations[Math.floor(sortedDurations.length * 0.95)]
    : 16.67;
  const maxFrameDuration = sortedDurations.length > 0
    ? sortedDurations[sortedDurations.length - 1]
    : 16.67;

  // Render summary
  const renderDurations = renderMetrics.map(m => m.duration);
  const slowRenders = renderDurations.filter(d => d > SLOW_RENDER_THRESHOLD).length;
  const avgRenderDuration = renderDurations.length > 0
    ? renderDurations.reduce((a, b) => a + b, 0) / renderDurations.length
    : 0;
  const maxRenderDuration = renderDurations.length > 0
    ? Math.max(...renderDurations)
    : 0;

  // Per-component render breakdown
  const byComponent: Record<string, { avg: number; max: number; count: number }> = {};
  for (const m of renderMetrics) {
    if (!byComponent[m.component]) {
      byComponent[m.component] = { avg: 0, max: 0, count: 0 };
    }
    const entry = byComponent[m.component];
    entry.count += 1;
    entry.avg = ((entry.avg * (entry.count - 1)) + m.duration) / entry.count;
    entry.max = Math.max(entry.max, m.duration);
  }

  // Generation summary
  const genDurations = generationMetrics.map(m => m.duration);
  const avgGenDuration = genDurations.length > 0
    ? genDurations.reduce((a, b) => a + b, 0) / genDurations.length
    : 0;
  const maxGenDuration = genDurations.length > 0
    ? Math.max(...genDurations)
    : 0;
  const genScores = generationMetrics.map(m => m.bestScore).filter(s => s > 0);
  const avgScore = genScores.length > 0
    ? genScores.reduce((a, b) => a + b, 0) / genScores.length
    : 0;
  const timeouts = generationMetrics.filter(m => m.duration >= 2500).length;
  const fallbacks = generationMetrics.filter(m => m.usedFallback).length;

  return {
    fps: {
      average: avgFrameDuration > 0 ? Math.round(1000 / avgFrameDuration) : 60,
      min: maxFrameDuration > 0 ? Math.round(1000 / maxFrameDuration) : 60,
      p95: p95Duration > 0 ? Math.round(1000 / p95Duration) : 60,
      droppedFrames,
      totalSamples: frameMetrics.length,
    },
    renders: {
      averageDuration: Math.round(avgRenderDuration * 100) / 100,
      maxDuration: Math.round(maxRenderDuration * 100) / 100,
      slowRenders,
      totalSamples: renderMetrics.length,
      byComponent,
    },
    puzzleGeneration: {
      averageDuration: Math.round(avgGenDuration),
      maxDuration: Math.round(maxGenDuration),
      timeouts,
      fallbacks,
      totalGenerated: generationMetrics.length,
      averageScore: Math.round(avgScore),
    },
  };
}

/**
 * Clear all collected metrics.
 */
export function clearMetrics(): void {
  frameMetrics = [];
  renderMetrics = [];
  generationMetrics = [];
  lastFrameTime = 0;
}

/**
 * Check if performance is degraded based on recent frame metrics.
 * Returns true if average FPS has dropped below 45 in the last sample window.
 */
export function isPerformanceDegraded(): boolean {
  if (frameMetrics.length < 30) return false; // Not enough data
  const recent = frameMetrics.slice(-60);
  const avgDuration = recent.reduce((a, b) => a + b.duration, 0) / recent.length;
  return avgDuration > 22; // < 45 fps
}

import { logEvent } from './eventLogger';

/**
 * Error Reporting Service
 *
 * Centralized error capture and reporting. Logs errors to the event system
 * and provides a global error handler for unhandled exceptions.
 *
 * When a real crash reporting service (e.g., Sentry, Crashlytics) is integrated,
 * update `reportError()` to forward errors there.
 */

interface ErrorContext {
  /** Where the error occurred (e.g., 'victory_flow', 'puzzle_generation') */
  source: string;
  /** Additional data about the error context */
  metadata?: Record<string, unknown>;
}

export interface ErrorReporterPayload {
  message: string;
  stack?: string;
  source: string;
  metadata?: Record<string, unknown>;
  breadcrumbs: string[];
  timestamp: number;
}

export interface ErrorReporter {
  capture(payload: ErrorReporterPayload): void | Promise<void>;
}

// In-memory error log for current session (not persisted across restarts)
const sessionErrors: Array<{
  error: Error | string;
  context: ErrorContext;
  timestamp: number;
}> = [];

const MAX_SESSION_ERRORS = 50;
const MAX_BREADCRUMBS = 40;
const breadcrumbs: string[] = [];
let installedGlobalHandler = false;
let reporter: ErrorReporter | null = null;

/**
 * Register a crash reporter adapter (Sentry/Crashlytics/etc.).
 * Keep this optional so local/dev builds work without remote services.
 */
export function setErrorReporter(nextReporter: ErrorReporter | null): void {
  reporter = nextReporter;
}

export function getErrorReporter(): ErrorReporter | null {
  return reporter;
}

export function addBreadcrumb(message: string): void {
  const entry = `${new Date().toISOString()} ${message}`;
  breadcrumbs.push(entry);
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
  }
}

export function getRecentBreadcrumbs(): string[] {
  return [...breadcrumbs];
}

export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

/**
 * Report an error with context.
 * Currently logs to eventLogger. Replace with Sentry/Crashlytics when available.
 */
export function reportError(error: Error | string, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  const timestamp = Date.now();

  // Log to event system
  logEvent({
    type: 'app_error',
    data: {
      message: errorMessage,
      stack: errorStack?.slice(0, 500), // Truncate stack to save space
      source: context.source,
      breadcrumbs: breadcrumbs.slice(-8),
      ...context.metadata,
    },
  });

  // Store in session memory
  sessionErrors.push({
    error,
    context,
    timestamp,
  });

  // Trim session log
  if (sessionErrors.length > MAX_SESSION_ERRORS) {
    sessionErrors.splice(0, sessionErrors.length - MAX_SESSION_ERRORS);
  }

  // Console warn for dev visibility
  console.warn(`[WordShift Error] ${context.source}: ${errorMessage}`);

  // Forward to optional remote reporter.
  const currentReporter = reporter;
  if (currentReporter) {
    try {
      const result = currentReporter.capture({
        message: errorMessage,
        stack: errorStack,
        source: context.source,
        metadata: context.metadata,
        breadcrumbs: getRecentBreadcrumbs(),
        timestamp,
      });
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch(() => {});
      }
    } catch {
      // Never throw from error reporting.
    }
  }
}

/**
 * Get errors from the current session (for diagnostics)
 */
export function getSessionErrors(): typeof sessionErrors {
  return [...sessionErrors];
}

/**
 * Clear session error log
 */
export function clearSessionErrors(): void {
  sessionErrors.length = 0;
}

/**
 * Install global error handlers.
 * Call once at app startup.
 */
export function installGlobalErrorHandler(): void {
  if (installedGlobalHandler) return;
  installedGlobalHandler = true;

  // Capture unhandled promise rejections
  const globalObj = globalThis as unknown as Record<string, unknown>;
  const originalHandler = globalObj.onunhandledrejection as
    ((event: { reason: unknown }) => void) | undefined;

  globalObj.onunhandledrejection = (event: { reason: unknown }) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    reportError(error, {
      source: 'unhandled_promise_rejection',
    });
    if (originalHandler) originalHandler(event);
  };

  // Capture global JS errors
  const maybeErrorUtils = (globalObj.ErrorUtils ?? null) as {
    getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
    setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
  } | null;

  if (maybeErrorUtils?.getGlobalHandler && maybeErrorUtils?.setGlobalHandler) {
    const originalErrorHandler = maybeErrorUtils.getGlobalHandler();
    maybeErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      reportError(error, {
        source: 'global_error_handler',
        metadata: { isFatal },
      });
      // Preserve default RN behavior (red screen in dev, etc.).
      originalErrorHandler(error, isFatal);
    });
  }
}

import { logEvent } from './eventLogger';

/**
 * Error Reporting Service
 *
 * Centralized error capture and reporting. Logs errors to the event system
 * and provides a global error handler for unhandled exceptions.
 *
 * Errors become `app_error` events in the local event log, which the
 * telemetry uploader (telemetry.ts) forwards to a collector once
 * `extra.telemetryEndpoint` is configured in app.json — so configuring
 * telemetry alone yields remote crash visibility with no extra SDK.
 * To add richer crash grouping/symbolication (Sentry, Crashlytics),
 * forward `error` from `reportError()` to that SDK here as well.
 */

interface ErrorContext {
  /** Where the error occurred (e.g., 'victory_flow', 'puzzle_generation') */
  source: string;
  /** Additional data about the error context */
  metadata?: Record<string, unknown>;
}

// In-memory error log for current session (not persisted across restarts)
const sessionErrors: Array<{
  error: Error | string;
  context: ErrorContext;
  timestamp: number;
}> = [];

const MAX_SESSION_ERRORS = 50;

/**
 * Report an error with context.
 * Currently logs to eventLogger. Replace with Sentry/Crashlytics when available.
 */
export function reportError(error: Error | string, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Log to event system
  logEvent({
    type: 'app_error',
    data: {
      message: errorMessage,
      stack: errorStack?.slice(0, 500), // Truncate stack to save space
      source: context.source,
      ...context.metadata,
    },
  });

  // Store in session memory
  sessionErrors.push({
    error,
    context,
    timestamp: Date.now(),
  });

  // Trim session log
  if (sessionErrors.length > MAX_SESSION_ERRORS) {
    sessionErrors.splice(0, sessionErrors.length - MAX_SESSION_ERRORS);
  }

  // Console warn for dev visibility
  console.warn(`[WordShift Error] ${context.source}: ${errorMessage}`);
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
  // Capture unhandled promise rejections
  const originalHandler = (global as Record<string, unknown>).onunhandledrejection as
    ((event: { reason: unknown }) => void) | undefined;

  (global as Record<string, unknown>).onunhandledrejection = (event: { reason: unknown }) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    reportError(error, {
      source: 'unhandled_promise_rejection',
    });
    if (originalHandler) originalHandler(event);
  };

  // Capture global JS errors
  const originalErrorHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    reportError(error, {
      source: 'global_error_handler',
      metadata: { isFatal },
    });
    // Call original handler to preserve default behavior (e.g., red screen in dev)
    originalErrorHandler(error, isFatal);
  });
}

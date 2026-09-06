import { logEvent } from './eventLogger';

/**
 * Error Reporting Service
 *
 * Centralized error capture and reporting. Logs errors to the event system
 * and provides a global error handler for unhandled exceptions.
 *
 * Errors become `app_error` events in the local event log, which the
 * telemetry uploader (telemetry.ts) forwards to the Supabase `events` table
 * when `extra.supabaseUrl`/`supabaseAnonKey` are set (or a custom
 * `extra.telemetryEndpoint` if that's configured instead) — so configured
 * telemetry yields remote crash visibility with no extra SDK. Richer crash
 * grouping/symbolication ships via the native @sentry/react-native SDK
 * (initialized in App.tsx); `setErrorForwarder` remains an optional seam to
 * also forward `error` from `reportError()` to a custom sink.
 */

interface ErrorContext {
  /** Where the error occurred (e.g., 'victory_flow', 'puzzle_generation') */
  source: string;
  /** Additional data about the error context */
  metadata?: Record<string, unknown>;
}

// In-memory error log for current session (not persisted across restarts)
const sessionErrors: {
  error: Error | string;
  context: ErrorContext;
  timestamp: number;
}[] = [];

const MAX_SESSION_ERRORS = 50;

/**
 * Optional pluggable forwarder for remote crash reporting. Default = none, so
 * the local-only behavior is unchanged until a forwarder is registered. (The
 * shipping remote crash path is the native @sentry/react-native SDK in App.tsx;
 * this seam stays available for a custom sink.)
 */
type ErrorForwarder = (error: Error | string, context: ErrorContext) => void;
let errorForwarder: ErrorForwarder | null = null;

/**
 * Register a forwarder that receives every reported error AFTER local logging.
 * Pass null to remove it. Forwarders run inside a try/catch so a failing
 * transport can never break local error reporting.
 */
export function setErrorForwarder(fn: ErrorForwarder | null): void {
  errorForwarder = fn;
}

/**
 * Report an error with context.
 * Logs to eventLogger and (if registered) forwards to a remote crash sink.
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

  // Forward to the remote crash sink last, never letting it throw.
  if (errorForwarder) {
    try {
      errorForwarder(error, context);
    } catch {
      // A failing transport must never break local error reporting.
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

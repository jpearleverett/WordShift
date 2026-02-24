import * as Sentry from '@sentry/react-native';
import { getRuntimeConfig } from '../config/runtime';
import { ErrorReporterPayload, setErrorReporter } from './errorReporting';

let sentryInitialized = false;

function toError(payload: ErrorReporterPayload): Error {
  const err = new Error(payload.message);
  if (payload.stack) {
    err.stack = payload.stack;
  }
  return err;
}

export function initSentryCrashReporter(): { enabled: boolean; initialized: boolean } {
  const runtime = getRuntimeConfig();
  if (!runtime.enableSentry || !runtime.sentryDsn) {
    return { enabled: false, initialized: false };
  }
  if (sentryInitialized) {
    return { enabled: true, initialized: true };
  }

  Sentry.init({
    dsn: runtime.sentryDsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
  });

  setErrorReporter({
    capture(payload: ErrorReporterPayload): void {
      const error = toError(payload);
      Sentry.withScope((scope) => {
        scope.setTag('source', payload.source);
        scope.setContext('wordshift_error', {
          source: payload.source,
          metadata: payload.metadata ?? {},
          breadcrumbs: payload.breadcrumbs,
          timestamp: payload.timestamp,
        });
        if (payload.metadata) {
          for (const [key, value] of Object.entries(payload.metadata)) {
            scope.setExtra(key, value as any);
          }
        }
        Sentry.captureException(error);
      });
    },
  });

  sentryInitialized = true;
  return { enabled: true, initialized: true };
}

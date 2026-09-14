import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { appBootstrap } from '../services/appBootstrap';
import { BootStage, getBootFailureStage } from '../services/bootCoordinator';
import { reportError } from '../services/errorReporting';
import { StorageRecoveryRequiredError } from '../services/persistenceStorage';

/** Owns one cancellable bootstrap attempt and its system-motion subscription. */
export function useAppBoot() {
  const [status, setStatus] = useState<'opening' | 'ready' | 'failed'>('opening');
  const [failedStage, setFailedStage] = useState<BootStage | null>(null);
  const [cloudEscape, setCloudEscape] = useState(false);
  const [attempt, retryAttempt] = useReducer((value: number) => value + 1, 0);
  const [, refreshMotion] = useReducer((value: number) => value + 1, 0);
  // The player's second escape: a retry that skips ONLY the cloud restore
  // stage. Armed by continueWithoutCloud, cleared by an ordinary retry.
  const skipCloudRestoreRef = useRef(false);
  useEffect(() => {
    let current = true;
    const skipCloudRestore = skipCloudRestoreRef.current;
    const boot = appBootstrap.start(refreshMotion, { skipCloudRestore });
    boot.done.then((result) => {
      if (current && result === 'ready') setStatus('ready');
    }).catch((error) => {
      if (!current) return;
      const stage = getBootFailureStage(error) ?? null;
      // A boot that cannot open is the one failure the owner must see: it
      // reaches Sentry and the app_error event stream with the stage that
      // threw, never only the dev console (reportError still console.warns).
      reportError(error instanceof Error ? error : String(error), {
        source: 'app_boot',
        metadata: { attempt, stage, skipCloudRestore },
      });
      setFailedStage(stage);
      // The cloud restore swallows every provider/network error itself, so a
      // rejection tagged 'restoreCloud' that is a StorageRecoveryRequiredError
      // is a LOCAL journal/write failure inside the restore transaction: the
      // 'continue without the cloud' escape would replay that commit through
      // the migrations stage anyway, so it stays fail-closed with the local
      // copy. Only a non-storage failure inside that stage may route around.
      setCloudEscape(stage === 'restoreCloud' && !(error instanceof StorageRecoveryRequiredError));
      setStatus('failed');
    });
    return () => { current = false; boot.cancel(); };
  }, [attempt]);
  const retry = useCallback(() => {
    skipCloudRestoreRef.current = false;
    setStatus('opening');
    retryAttempt();
  }, []);
  const continueWithoutCloud = useCallback(() => {
    skipCloudRestoreRef.current = true;
    setStatus('opening');
    retryAttempt();
  }, []);
  // Only a failure INSIDE the cloud restore stage is safe to route around: a
  // local recovery, migration or victory replay that throws must stay closed
  // (opening on top of it could re-charge or lose progress).
  const canContinueWithoutCloud = status === 'failed' && cloudEscape;
  return { status, retry, continueWithoutCloud, canContinueWithoutCloud, failedStage };
}

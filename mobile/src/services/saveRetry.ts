import { showGameAlert } from './gameAlert';
import { reportError } from './errorReporting';

/** A solved board stays locked until its durable receipt exists. */
export async function saveWithPlayerRetry<T>(save: () => Promise<T>, copy = { title: 'Your solved board is waiting', message: 'We could not save the reward. If your device storage is full, free some space, then try again.' }): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await save();
    } catch (error) {
      // Every retry round is a storage failure the player is now waiting on;
      // surface it so repeated device-storage trouble reaches crash reporting.
      reportError(error instanceof Error ? error : String(error), {
        source: 'save_retry',
        metadata: { title: copy.title, attempt },
      });
      await new Promise<void>(resolve => {
        showGameAlert(
          copy.title,
          copy.message,
          [{ text: 'Retry save', onPress: resolve }],
        );
      });
    }
  }
}

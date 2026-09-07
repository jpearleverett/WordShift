import { showGameAlert } from './gameAlert';

/** A solved board stays locked until its durable receipt exists. */
export async function saveWithPlayerRetry<T>(save: () => Promise<T>, copy = { title: 'Your solved board is waiting', message: 'We could not save the reward. If your device storage is full, free some space, then try again.' }): Promise<T> {
  for (;;) {
    try {
      return await save();
    } catch {
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

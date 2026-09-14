import { saveWithPlayerRetry } from '../services/saveRetry';
import { setGameAlertListener, type GameAlertRequest } from '../services/gameAlert';
import { reportError } from '../services/errorReporting';

jest.mock('../services/errorReporting', () => ({ reportError: jest.fn() }));

it('waits for a player retry and returns only the durable save result', async () => {
  let alert: GameAlertRequest | undefined;
  const unsubscribe = setGameAlertListener(request => { alert = request; });
  const save = jest.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce({ receipt: 'saved' });
  const pending = saveWithPlayerRetry(save);
  await Promise.resolve();
  expect(save).toHaveBeenCalledTimes(1);
  expect(alert?.title).toBe('Your solved board is waiting');
  alert?.buttons[0].onPress?.();
  await expect(pending).resolves.toEqual({ receipt: 'saved' });
  expect(save).toHaveBeenCalledTimes(2);
  // The failed round is reported (source + attempt) so storage trouble is visible remotely.
  expect(reportError).toHaveBeenCalledTimes(1);
  expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
    source: 'save_retry',
    metadata: { title: 'Your solved board is waiting', attempt: 1 },
  });
  unsubscribe();
});

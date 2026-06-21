jest.mock('react-native', () => ({
  Share: { share: jest.fn().mockResolvedValue({ action: 'sharedAction' }), sharedAction: 'sharedAction' },
}));

jest.mock('../services/shareResults', () => ({
  sharePuzzleResult: jest.fn().mockResolvedValue(true),
  generateShareText: jest.fn().mockReturnValue('share text'),
  recordShareSuccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));

import {
  shareResultImage,
  isImageShareAvailable,
  setShareImageProvider,
} from '../services/shareImage';
import { sharePuzzleResult, recordShareSuccess } from '../services/shareResults';
import type { ShareableResult } from '../services/shareResults';

const RESULT: ShareableResult = {
  stars: 3,
  difficulty: 'MEDIUM',
  hintsUsed: 0,
  invalidAttempts: 0,
  moveCount: 3,
};

describe('shareImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setShareImageProvider(null);
  });

  it('reports no capturer by default (Expo Go)', () => {
    expect(isImageShareAvailable()).toBe(false);
  });

  it('falls back to the text share when no capturer is registered', async () => {
    const ok = await shareResultImage({}, RESULT);
    expect(ok).toBe(true);
    expect(sharePuzzleResult).toHaveBeenCalledWith(RESULT);
    // Text path owns its own bonus credit — image path must not also credit.
    expect(recordShareSuccess).not.toHaveBeenCalled();
  });

  it('captures + shares an image when a capturer is registered', async () => {
    const capture = jest.fn().mockResolvedValue('file:///tmp/card.png');
    const shareFile = jest.fn().mockResolvedValue(true);
    setShareImageProvider({ capture, shareFile });

    const ok = await shareResultImage({ some: 'ref' }, RESULT);
    expect(ok).toBe(true);
    expect(capture).toHaveBeenCalled();
    expect(shareFile).toHaveBeenCalledWith('file:///tmp/card.png', 'share text');
    expect(recordShareSuccess).toHaveBeenCalledTimes(1);
    expect(sharePuzzleResult).not.toHaveBeenCalled();
  });

  it('does not credit the bonus if the image share is cancelled', async () => {
    setShareImageProvider({
      capture: jest.fn().mockResolvedValue('file:///tmp/card.png'),
      shareFile: jest.fn().mockResolvedValue(false),
    });
    const ok = await shareResultImage({}, RESULT);
    expect(ok).toBe(false);
    expect(recordShareSuccess).not.toHaveBeenCalled();
  });

  it('falls back to text if capture throws', async () => {
    setShareImageProvider({
      capture: jest.fn().mockRejectedValue(new Error('no native module')),
      shareFile: jest.fn(),
    });
    const ok = await shareResultImage({}, RESULT);
    expect(ok).toBe(true);
    expect(sharePuzzleResult).toHaveBeenCalledWith(RESULT);
  });

  it('falls back to text when given a null ref even with a capturer', async () => {
    setShareImageProvider({ capture: jest.fn(), shareFile: jest.fn() });
    const ok = await shareResultImage(null, RESULT);
    expect(ok).toBe(true);
    expect(sharePuzzleResult).toHaveBeenCalled();
  });
});

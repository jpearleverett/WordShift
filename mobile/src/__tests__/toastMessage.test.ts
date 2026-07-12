import { hasVisibleToastMessage } from '../components/puzzle/toastMessage';

describe('hasVisibleToastMessage', () => {
  test.each(['', '   ', '\n\t'])('hides an empty message (%j)', message => {
    expect(hasVisibleToastMessage(message)).toBe(false);
  });

  test('shows a message containing visible text', () => {
    expect(hasVisibleToastMessage('  Nice move!  ')).toBe(true);
  });
});

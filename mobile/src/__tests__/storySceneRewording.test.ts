/**
 * A scene is frozen into the save when it opens, so a rewrite used to reach
 * only scenes not yet opened. An unfinished scene now reopens in the current
 * wording, matched line by line through each line's art id.
 */
import { refreshSceneWording, StoryScene } from '../services/storySpine';

const scene = (lines: [string, string | undefined][], response: [string, string | undefined][] = []): StoryScene => ({
  id: 'returned',
  title: 'What came back',
  memory: 'm',
  lines: lines.map(([text, artId]) => ({ speaker: 'narrator', text, ...(artId ? { artId } : {}) })),
  ...(response.length ? { options: [{ id: 'a', label: 'A', response: response.map(([text, artId]) => ({ speaker: 'fox' as const, text, ...(artId ? { artId } : {}) })) }] } : {}),
});

describe('refreshSceneWording', () => {
  it('takes the current text of every line with a matching art id, lines and options alike', () => {
    const saved = scene([['old one', 'r-01'], ['old two', 'r-02']], [['old reply', 'r-03']]);
    const fresh = scene([['new one', 'r-01'], ['new two', 'r-02']], [['new reply', 'r-03']]);
    expect(refreshSceneWording(saved, fresh)).toBe(true);
    expect(saved.lines.map(l => l.text)).toEqual(['new one', 'new two']);
    expect(saved.options![0].response[0].text).toBe('new reply');
  });

  it('keeps the saved page count and any line the fresh scene does not have', () => {
    const saved = scene([['recollection', 'r-recollection'], ['old one', 'r-01'], ['untagged', undefined]]);
    const fresh = scene([['new one', 'r-01']]);
    refreshSceneWording(saved, fresh);
    expect(saved.lines.map(l => l.text)).toEqual(['recollection', 'new one', 'untagged']);
  });

  it('reports no change when the wording is already current', () => {
    const saved = scene([['same', 'r-01']]);
    expect(refreshSceneWording(saved, scene([['same', 'r-01']]))).toBe(false);
  });
});

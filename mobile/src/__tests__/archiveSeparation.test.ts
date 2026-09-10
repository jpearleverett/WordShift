import fs from 'fs';
import path from 'path';

import { STORY_COPY } from '../services/storySpine';
import { getStoryArchiveChapterSummary } from '../services/storyArchive';
import * as gallery from '../services/whisperGallery';
import { getWhisperGalleryEmptyText } from '../services/phaseNarrative';
import { DialoguePhase } from '../types/homeWorld';

/**
 * The two archives must stay separate and unlabelled.
 *
 * SEPARATE: the journal's earlier conversations own the base dialogue corpus
 * (it reads that corpus directly, so it is complete and cannot be evicted); the
 * whisper gallery owns only what is generated at runtime and exists in no
 * corpus at all. Recording a read conversation line into the gallery made it a
 * lossy second copy of the journal AND let its 500-entry cap evict the
 * whispers, offering responses and keepsakes that live nowhere else.
 *
 * UNLABELLED: neither archive may stamp a saved line with the name of the
 * stretch of the story it came from. Those names are the phase system in
 * costume, whether they are the gallery's old era titles or the journal's old
 * per-stretch chapter titles.
 */

const SRC = path.join(__dirname, '..');

/** Every name either archive has ever used for a stretch of the story. */
const STRETCH_NAMES = [
  'Bright Days', 'Curious Thoughts', 'Deeper Questions', 'Growing Shadows', 'The Horizon', 'Terrible Peace',
  'By the warm hearth', 'When questions began', 'The changing house', 'While the shadows gathered', 'Before the arrival',
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('the gallery records only what the journal cannot show', () => {
  it('never records a base conversation line, from any producer', () => {
    const kinds: { file: string; kind: string }[] = [];
    for (const file of sourceFiles(SRC)) {
      if (file.endsWith(path.join('services', 'whisperGallery.ts'))) continue;
      const source = fs.readFileSync(file, 'utf8');
      for (const call of source.match(/recordWhisper\(\{[\s\S]{0,400}?\}\)/g) ?? []) {
        const kind = call.match(/type: '(\w+)'/);
        kinds.push({ file: path.relative(SRC, file), kind: kind ? kind[1] : 'unknown' });
      }
    }
    // The five surviving producers: the post-victory whisper, the milestone
    // offering response, the answer a dialogue choice drew, the keeper's record
    // (recorded from both close handlers), and the late-pool line.
    //
    // Count raised 5 -> 6 when the late-pool producer was restored. The first
    // cut of this separation deleted the dialogue-advance recorder outright,
    // which was right for base lines and wrong for everything else that same
    // branch serves: see the late-pool suite below.
    expect(kinds.length).toBe(6);
    // Anything else (notably the legacy 'dialogue' kind the base lines used)
    // would be a second copy of the journal, and would be hidden on sight.
    expect(kinds.filter(entry => !['whisper', 'choice', 'keepsake', 'passage'].includes(entry.kind))).toEqual([]);
    expect(kinds.some(entry => entry.file.includes('useDialogueFlow') && entry.kind === 'choice')).toBe(true);
    expect(kinds.filter(entry => entry.kind === 'keepsake').length).toBe(2);
    expect(kinds.filter(entry => entry.kind === 'passage').length).toBe(1);
  });

  it('leaves the read-a-conversation-line path with no UNGATED gallery write', () => {
    const hook = fs.readFileSync(path.join(SRC, 'hooks', 'useDialogueFlow.ts'), 'utf8');
    // Two producers in the hook: the choice response, and the late-pool line.
    // (Was one; the late-pool producer is the restoration described above.)
    expect((hook.match(/recordWhisper\(\{/g) ?? []).length).toBe(2);
    expect(hook).toMatch(/text: result\.response,[\s\S]{0,80}type: 'choice'/);
    // The surviving dialogue-advance write is GATED: it may never fire for a
    // line the journal holds. If this guard is ever dropped, every base line
    // read starts being copied into the gallery again.
    expect(hook).toMatch(/if \(fromLatePool && currentFullText\) \{/);
  });
});

/**
 * The other half of the separation rule.
 *
 * "The journal owns conversations" is really "the journal owns the lines it can
 * SHOW", and storyArchive can only show phases 0-4 of ALL_DIALOGUES. Three
 * corpora are served by the very same dialogue-advance branch and appear in
 * none of that: the Phase-2 exhaustion pool, the post-revelation pool, and the
 * Tending milestone lines. Deleting the recorder wholesale retired ~455 lines
 * from BOTH archives at once, the Tending Shrine's entire reward among them.
 */
describe('the journal cannot show the late pools, so the gallery must keep them', () => {
  it('serves the late pools from modules the journal archive never reads', () => {
    const archive = fs.readFileSync(path.join(SRC, 'services', 'storyArchive.ts'), 'utf8');
    // The archive's only corpus reader, and its ceiling.
    expect(archive).toContain('getDialoguesForAnimal');
    expect(archive).toMatch(/phase >= 5/);

    const base = fs.readFileSync(path.join(SRC, 'services', 'dialogue', 'animalDialogueBase.ts'), 'utf8');
    // getDialoguesForAnimal filters ALL_DIALOGUES, and the exhaustion pool is a
    // separate export, so a pool line can never come back out of it.
    expect(base).toMatch(/getDialoguesForAnimal[\s\S]{0,220}ALL_DIALOGUES\.filter/);
    expect(base).toMatch(/export const PHASE2_EXTRA_DIALOGUES/);

    // The Phase-5 pool is built from its own modules, not from ALL_DIALOGUES.
    const pool = fs.readFileSync(path.join(SRC, 'services', 'dialogue', 'phase5Pool.ts'), 'utf8');
    expect(pool).toContain('getTendingMilestoneLines');
    expect(pool).toContain('getPostRevelationDialogue');
    expect(pool).not.toContain('ALL_DIALOGUES');
  });

  it('gates the gallery write on the branches that already detect a pool line', () => {
    const hook = fs.readFileSync(path.join(SRC, 'hooks', 'useDialogueFlow.ts'), 'utf8');
    // Phase 5 is always a pool line; Phase 2 only past the base block, and the
    // flag is set inside the existing pool branch rather than re-deriving it.
    expect(hook).toMatch(/let fromLatePool = animalPhase === 5;/);
    expect(hook).toMatch(/cur >= total2\) \{[\s\S]{0,260}fromLatePool = true;/);
    expect(hook).toMatch(/type: 'passage'/);
  });

  it('gives the kept passage a mark of its own on the gallery card', () => {
    const screen = fs.readFileSync(path.join(SRC, 'components', 'WhisperGalleryScreen.tsx'), 'utf8');
    expect(screen).toMatch(/passage: require\('\.\.\/\.\.\/assets\/ui\/scroll\.png'\)/);
  });

  it('keeps the passage kind visible (it is the only copy that exists)', () => {
    // HIDDEN_TYPES hides the legacy base-line kind and nothing else.
    const service = fs.readFileSync(path.join(SRC, 'services', 'whisperGallery.ts'), 'utf8');
    expect(service).toMatch(/HIDDEN_TYPES[^=]*=[^=]*new Set\(\['dialogue'\]\)/);
  });
});

describe('neither archive names a stretch of the story', () => {
  it('exposes no era-name builder to either surface', () => {
    expect(Object.keys(gallery)).not.toContain('getPhaseEraName');
  });

  it('keeps every stretch name out of the journal copy table', () => {
    expect(Object.keys(STORY_COPY)).not.toContain('archiveChapterTitles');
    for (const value of Object.values(STORY_COPY)) {
      if (typeof value !== 'string') continue;
      for (const name of STRETCH_NAMES) expect(value).not.toContain(name);
    }
  });

  it('keeps every stretch name out of the strings both archives render', () => {
    for (let phase = 0; phase <= 5; phase++) {
      const rendered = [
        gallery.getGalleryTitle(phase),
        gallery.getGallerySubtitle(phase, 7),
        getWhisperGalleryEmptyText(phase as DialoguePhase),
        getStoryArchiveChapterSummary(phase + 1),
      ];
      for (const text of rendered) {
        expect(text).not.toMatch(/Phase \d/i);
        for (const name of STRETCH_NAMES) expect(text).not.toContain(name);
      }
    }
  });

  it('renders no era text on a gallery entry card', () => {
    const screen = fs.readFileSync(path.join(SRC, 'components', 'WhisperGalleryScreen.tsx'), 'utf8');
    expect(screen).not.toContain('getPhaseEraName');
    // The entry card shows its mark and the quote, nothing that reads item.phase.
    expect(screen).not.toMatch(/item\.phase/);
  });

  it('titles a journal chapter with its speaker alone', () => {
    const modal = fs.readFileSync(path.join(SRC, 'components', 'StoryJournalModal.tsx'), 'utf8');
    expect(modal).not.toContain('archiveChapterTitles');
    expect(modal).toMatch(/const chapterTitle = \(item: StoryArchiveChapter\) => getStorySpeakerName\(item\.animal\);/);
  });
});

describe('the journey achievements do not name the stretches of the story either', () => {
  it('no achievement title or description carries an era name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ACHIEVEMENTS } = require('../services/achievements') as { ACHIEVEMENTS: { title: string; description: string }[] };
    const eras = ['Bright Days', 'Curious Thoughts', 'Deeper Questions', 'Growing Shadows', 'The Horizon', 'Terrible Peace'];
    for (const achievement of ACHIEVEMENTS) {
      for (const era of eras) {
        expect(achievement.title).not.toContain(era);
        expect(achievement.description).not.toContain(era);
      }
    }
  });
});

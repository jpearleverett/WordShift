import { STORY_ART_CATALOG } from '../data/storyArtCatalog';
import { StoryMemory, getStoryPages } from './storySpine';

const normalize = (text: string) => text.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
const byId = new Map<string, typeof STORY_ART_CATALOG[number]>(STORY_ART_CATALOG.map(art => [art.id, art]));
const stopWords = new Set('the a an i you your we it its is are was were to of and in on at for that this with have has had not do did as so be but one what'.split(' '));
const words = (text: string) => new Set(normalize(text).split(' ').filter(word => word.length > 2 && !stopWords.has(word)));

/**
 * Frozen story saves intentionally retain their original words. New art is
 * resolved without rewriting the transcript, choice, page, or saved phase.
 * Matching the whole scene in order also keeps unknown older wording from
 * selecting the same best-match image for every page.
 */
export function getStoryPageArtIds(memory: StoryMemory): string[] {
  const pages = getStoryPages(memory);
  const candidates = STORY_ART_CATALOG.filter(art => (art.scenes as readonly string[]).includes(memory.scene.id));
  const knownIds = pages.map(line => {
    const exact = candidates.find(art => art.samples.some(text => normalize(text) === normalize(line.text)));
    return line.artId && byId.has(line.artId) ? line.artId : exact?.id;
  });
  // An older unknown sentence must not steal the exact illustration of a
  // later page. Reserve authored and recognized beats before any fallback.
  const reserved = new Set(knownIds.filter((id): id is string => !!id));
  const used = new Set<string>();
  return pages.map((line, index) => {
    const known = knownIds[index];
    if (known && !used.has(known)) { used.add(known); return known; }
    const tokens = words(line.text);
    const available = candidates.filter(art => !used.has(art.id) && !reserved.has(art.id) && !art.id.endsWith('-recollection'));
    const scored = available.map((art, position) => ({
      id: art.id,
      score: Math.max(...art.samples.map(text => {
        const other = words(text);
        const shared = [...tokens].filter(word => other.has(word)).length;
        return shared / Math.max(1, tokens.size + other.size - shared);
      })) + (position === index ? 0.0001 : 0),
    })).sort((a, b) => b.score - a.score);
    const fallback = scored[0]?.id ?? candidates[index % candidates.length]?.id ?? 'cup-01';
    used.add(fallback);
    return fallback;
  });
}

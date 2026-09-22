/**
 * The Keeper's Edition music box: its song list and a guarded audio bridge.
 *
 * The track list is pure data so the box (and audio.ts, which validates a
 * request against it) share one source. Playback lazy-`require`s audio.ts
 * INSIDE each call, the same pattern as uiSound.ts: audio.ts statically imports
 * expo-audio (a native module), and the box is reachable from the shared ☰ menu,
 * so a static import would put expo-audio into the Jest and web graphs of every
 * screen that hosts the menu. Every call is guarded and never throws.
 */

/** Every authored bed, in the box's order: the house family, then the board. */
export const MUSIC_BOX_TRACKS: readonly string[] = [0, 1, 2, 3, 4, 5].map(p => `music_home_${p}`)
  .concat([0, 1, 2, 3, 4, 5].map(p => `music_puzzle_${p}`));

function audio(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./audio');
  } catch {
    return null;
  }
}

/** Play one song from the box (plays even with background music off). */
export function playMusicBoxSong(track: string): void {
  try { audio()?.playMusicBoxTrack(track)?.catch?.(() => {}); } catch { /* audio unavailable */ }
}

/** Stop the song that is playing. */
export function stopMusicBoxSong(): void {
  try { audio()?.stopMusic()?.catch?.(() => {}); } catch { /* audio unavailable */ }
}

/**
 * Hand music back to the house after the box closes: the house bed for the
 * current phase when background music is on, silence when it is off.
 */
export function restoreHouseMusic(phase: number): void {
  try {
    const a = audio();
    if (!a) return;
    Promise.resolve(a.isBackgroundMusicEnabled())
      .then((enabled: boolean) => (enabled ? a.startMusicForScreen('home', phase) : a.stopMusic()))
      .catch(() => {});
  } catch { /* audio unavailable */ }
}

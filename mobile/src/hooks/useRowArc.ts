import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Keep the target fan mounted only for its own close animation.
 *
 * A graceful 300ms collapse is reserved for a pure DESELECT: the board is
 * unchanged and the row stays the target, so the letters can glide back to
 * their standard positions. Anything that changes the board under the fan
 * snaps it away instead: a committed move (the row stops being the target), a
 * motion preference change, or a letter arriving in / leaving this row while
 * it stays the target (a double-shift first drop, the winning move, an undo).
 * `wordCount` is that last signal. The snap matters because Row mounts the arc
 * and standard subtrees under distinct keys, so every flip REMOUNTS the row's
 * tiles: an arriving tile that had started its arrival settle inside a
 * gracefully collapsing arc would be cut off at the collapse's end. Snapping
 * hands the arriving tile straight to the standard layout, where it settles
 * once, and the surviving letters rank-close via Row's F1 spring exactly as
 * they do on every other committed move. (Row separately gates each arrival
 * to the layout generation it first rendered in, so later flips, such as the
 * fan reopening for a double-shift second pick, never replay it either.)
 *
 * A snap or a finished collapse cannot revive on undo. This relies on a row
 * never being both the source and the target of one move, so a move that
 * clears the selection always changes the target row's length or its role.
 */
export function useRowArc(
  showSlots: boolean,
  isTarget: boolean,
  instant: boolean,
  arc: Animated.Value,
  slots: Animated.Value,
  wordCount: number,
): boolean {
  const [visible, setVisible] = useState(showSlots);
  const [previousShowSlots, setPreviousShowSlots] = useState(showSlots);
  const [previousWordCount, setPreviousWordCount] = useState(wordCount);
  if (previousShowSlots !== showSlots) {
    setPreviousShowSlots(showSlots);
    if (showSlots) setVisible(true);
  }
  let boardChanged = false;
  if (previousWordCount !== wordCount) {
    setPreviousWordCount(wordCount);
    boardChanged = true;
  }
  if (visible && !showSlots && (!isTarget || instant || boardChanged)) setVisible(false);

  useEffect(() => {
    if (instant || !isTarget) {
      arc.setValue(showSlots && isTarget ? 1 : 0);
      slots.setValue(1);
      return;
    }
    if (showSlots) {
      slots.setValue(1);
      // Animate from the current pose when a closing fan is reopened. The
      // selected letter is intentionally not an input: swapping its preview
      // leaves this same fan open and never restarts the entrance.
      const opening = Animated.timing(arc, {
        toValue: 1, duration: 450,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
      opening.start();
      return () => opening.stop();
    }
    if (!visible) {
      // Nothing is mounted (a snap, or a collapse that finished): rest the fan
      // flat so the next open glides from the closed pose. Safe to re-arm the
      // slot fade here because the arc subtree is already unmounted; while it
      // was still live this reset would have flung the letters back apart for
      // a frame, which is why the close animation itself never does it.
      arc.setValue(0);
      slots.setValue(1);
      return;
    }
    let cancelled = false;
    const closing = Animated.parallel([
      Animated.timing(arc, {
        toValue: 0, duration: 300,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(slots, {
        toValue: 0, duration: 300,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
    ]);
    closing.start(({ finished }) => {
      if (finished && !cancelled) setVisible(false);
    });
    return () => { cancelled = true; closing.stop(); };
  }, [showSlots, isTarget, instant, visible, arc, slots]);

  return isTarget && (showSlots || (visible && !instant));
}

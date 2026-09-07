import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/** Keep the target fan mounted only for its own close animation. A committed
 * move or a motion preference change snaps it away and cannot revive on undo. */
export function useRowArc(
  showSlots: boolean,
  isTarget: boolean,
  instant: boolean,
  arc: Animated.Value,
  slots: Animated.Value,
): boolean {
  const [visible, setVisible] = useState(showSlots);
  const [previousShowSlots, setPreviousShowSlots] = useState(showSlots);
  if (previousShowSlots !== showSlots) {
    setPreviousShowSlots(showSlots);
    if (showSlots) setVisible(true);
  }
  if (visible && !showSlots && (!isTarget || instant)) setVisible(false);

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
    if (!visible) return;
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

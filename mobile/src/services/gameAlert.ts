/**
 * In-game replacement for React Native's Alert.alert.
 *
 * The OS alert renders in the system's own chrome and font, which breaks the
 * cottage skin (and the single-typeface rule) every time it appears. This
 * module keeps Alert.alert's call shape but routes the request to a
 * cottage-skinned host modal (components/ui/GameAlertModal, mounted once at
 * the App root), so every popup is game furniture.
 *
 * API mirrors Alert.alert: showGameAlert(title, message?, buttons?). Buttons
 * default to a single OK. The host shows one alert at a time and queues the
 * rest in arrival order.
 */

export interface GameAlertButton {
  text: string;
  onPress?: () => void;
  /** Mirrors Alert's button styles; the host maps them to cottage variants. */
  style?: 'default' | 'cancel' | 'destructive';
}

export interface GameAlertRequest {
  title: string;
  message?: string;
  buttons: GameAlertButton[];
}

type Listener = (request: GameAlertRequest) => void;

let listener: Listener | null = null;
// Requests that arrive before the host mounts (or between hosts during a
// remount) are held here and flushed to the next listener.
let pending: GameAlertRequest[] = [];

export function showGameAlert(
  title: string,
  message?: string,
  buttons?: GameAlertButton[],
): void {
  const request: GameAlertRequest = {
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
  };
  if (listener) {
    listener(request);
  } else {
    pending.push(request);
  }
}

/** Host registration. Returns an unsubscribe. Flushes queued requests. */
export function setGameAlertListener(next: Listener | null): () => void {
  listener = next;
  if (next && pending.length > 0) {
    const queued = pending;
    pending = [];
    for (const request of queued) next(request);
  }
  return () => {
    if (listener === next) listener = null;
  };
}

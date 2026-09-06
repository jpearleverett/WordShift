import { useEffect, useLayoutEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { createLaunchIntentQueue } from '../services/launchIntentQueue';

const consumedLaunchIntents = new Set<string>();
let liveIntentSequence = 0;

export function useLaunchIntents(
  ready: boolean,
  onLink: (url: string, isCurrent: () => boolean) => void,
  onNotification: (target: unknown, isCurrent: () => boolean) => void,
  onboarding: boolean,
) {
  const handlers = useRef({ onLink, onNotification, onboarding });
  useLayoutEffect(() => { handlers.current = { onLink, onNotification, onboarding }; }, [onLink, onNotification, onboarding]);
  const queue = useRef<ReturnType<typeof createLaunchIntentQueue> | null>(null);
  useEffect(() => {
    let closed = false;
    const session = createLaunchIntentQueue(consumedLaunchIntents, (intent, isCurrent) => {
      if (intent.kind === 'link') handlers.current.onLink(intent.value, isCurrent);
      else handlers.current.onNotification(intent.value, isCurrent);
    }, (intent) => !handlers.current.onboarding || (intent.kind === 'link' && intent.value.toLowerCase().startsWith('wordshift://creator')));
    queue.current = session;
    Linking.getInitialURL().then((url) => {
      if (url) session.add('launch-url', { kind: 'link', value: url });
    }).catch(() => {});
    const links = Linking.addEventListener('url', ({ url }) => {
      session.add(`link-${++liveIntentSequence}`, { kind: 'link', value: url });
    });
    let notifications: { remove?: () => void } | undefined;
    void import('expo-notifications').then((source) => {
      if (closed) return;
      const receive = (response: { notification?: { request?: { identifier?: string; content?: { data?: { target?: unknown } } } } } | null, initial: boolean) => {
        const request = response?.notification?.request;
        const target = request?.content?.data?.target;
        if (target == null) return;
        const id = request?.identifier ? `notification-${request.identifier}` : initial ? 'launch-notification' : `notification-${++liveIntentSequence}`;
        session.add(id, { kind: 'notification', value: target });
      };
      notifications = source.addNotificationResponseReceivedListener((response: Parameters<typeof receive>[0]) => receive(response, false));
      source.getLastNotificationResponseAsync?.().then((response: Parameters<typeof receive>[0]) => receive(response, true)).catch(() => {});
    }).catch(() => { /* Optional native module is absent in some development hosts. */ });
    return () => {
      session.dispose();
      closed = true;
      if (queue.current === session) queue.current = null;
      links.remove();
      notifications?.remove?.();
    };
  }, []);
  useEffect(() => { queue.current?.setReady(ready); }, [ready, onboarding]);
}

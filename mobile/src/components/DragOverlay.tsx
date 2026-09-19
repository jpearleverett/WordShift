import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export interface DragFrame { x: number; y: number; width: number; height: number }

/** Both measurements are window-space, so safe-area and root offsets cancel. */
export function relativeDragFrame(tile: DragFrame, host: Pick<DragFrame, 'x' | 'y'>): DragFrame {
  return { ...tile, x: tile.x - host.x, y: tile.y - host.y };
}

interface OverlayRequest {
  owner: object;
  anchor: View;
  render: (frame: DragFrame) => React.ReactNode;
}
interface DragOverlayApi {
  show: (request: OverlayRequest) => void;
  clear: (owner: object) => void;
}
const DragOverlayContext = createContext<DragOverlayApi | null>(null);

/** A pointer-transparent visual layer OUTSIDE the puzzle's native ScrollView.
 * Native scroll views clip children regardless of a tile's elevation/zIndex.
 * Keep the gesture responder in its row; only the visual copy leaves it. */
export function DragOverlayProvider({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<View>(null);
  const ownerRef = useRef<object | null>(null);
  const revisionRef = useRef(0);
  const [floating, setFloating] = useState<React.ReactNode>(null);
  const clear = useCallback((owner: object) => {
    if (ownerRef.current !== owner) return;
    ownerRef.current = null;
    revisionRef.current += 1;
    setFloating(null);
  }, []);
  const show = useCallback(({ owner, anchor, render }: OverlayRequest) => {
    ownerRef.current = owner;
    const revision = ++revisionRef.current;
    // Never leave the preceding drag visible while native measurement resolves.
    setFloating(null);
    anchor.measureInWindow((x, y, width, height) => {
      if (revision !== revisionRef.current || width <= 0 || height <= 0) return;
      hostRef.current?.measureInWindow((hostX, hostY) => {
        if (revision !== revisionRef.current) return;
        setFloating(render(relativeDragFrame({ x, y, width, height }, { x: hostX, y: hostY })));
      });
    });
  }, []);
  const api = useMemo(() => ({ show, clear }), [show, clear]);
  return (
    <DragOverlayContext.Provider value={api}>
      <View ref={hostRef} style={styles.host} collapsable={false}>
        {children}
        <View
          testID="puzzle-drag-overlay"
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={styles.overlay}
        >
          {floating}
        </View>
      </View>
    </DragOverlayContext.Provider>
  );
}

export const useDragOverlay = () => useContext(DragOverlayContext);

const styles = StyleSheet.create({
  host: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10000, elevation: 10000, overflow: 'visible' },
});

import { useEffect, useState } from 'react';
import { getSettingsSync, subscribeSettings } from '../services/settings';

/** Subscribe only to the effective preference so active scenes update with the OS. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getSettingsSync().reducedMotion);
  useEffect(() => subscribeSettings(() => setReduced(getSettingsSync().reducedMotion)), []);
  return reduced;
}

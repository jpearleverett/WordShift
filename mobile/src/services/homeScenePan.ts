export const clampHomeScenePanY = (panY: number, maxPanY: number): number => {
  return Math.max(0, Math.min(maxPanY, panY));
};

interface ResolveHomeScenePanYInput {
  currentPanY: number | null;
  savedPanY?: number | null;
  maxPanY: number;
}

export const resolveHomeScenePanY = ({
  currentPanY,
  savedPanY = null,
  maxPanY,
}: ResolveHomeScenePanYInput): number => {
  return clampHomeScenePanY(currentPanY ?? savedPanY ?? maxPanY, maxPanY);
};

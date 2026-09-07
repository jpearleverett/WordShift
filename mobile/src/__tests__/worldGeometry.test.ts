import { getPitGeometry, getSkyBoxHeight, SKY_IMG_HEIGHT, SKY_IMG_WIDTH } from '../services/worldGeometry';

test.each([[320, 568], [393, 852], [852, 393], [1024, 1366], [1366, 1024]])(
  'current %sx%s viewport seats the sky and keeps the pit, ward and touch zone together', (width, height) => {
    const sky = getSkyBoxHeight(width, height);
    expect(sky / SKY_IMG_HEIGHT).toBeGreaterThan(width / SKY_IMG_WIDTH);
    const pit = getPitGeometry(width, height, 44);
    expect(pit.PIT_CENTER.x).toBe(width / 2);
    expect(pit.PIT_CENTER.y).toBeLessThan(height);
    expect(pit.PIT_CENTER.x - pit.PIT_OVAL.radiusX).toBeGreaterThan(0);
    expect(pit.PIT_CENTER.x + pit.PIT_OVAL.radiusX).toBeLessThan(width);
    expect(pit.WARD_RING_SIZE_Y * pit.WARD_RING_SCALE_X).toBeCloseTo((pit.PIT_OVAL.radiusX + 10) * 2);
    expect(pit.GLOW_RIM_SIZE_Y * pit.GLOW_RIM_SCALE_X).toBeCloseTo(pit.PIT_OVAL.radiusX * 2);
    expect(pit.FLOAT_ZONE.top).toBeLessThan(pit.FLOAT_ZONE.bottom);
    expect(pit.FLOAT_ZONE.right).toBeLessThan(width);
    expect(pit.FLOAT_ZONE.left).toBeGreaterThan(0);
  },
);

test('rotation recomputes both the destination and available word area', () => {
  const portrait = getPitGeometry(393, 852, 44);
  const landscape = getPitGeometry(852, 393, 44);
  expect(landscape.PIT_CENTER.x).toBeGreaterThan(portrait.PIT_CENTER.x);
  expect(landscape.PIT_CENTER.y).toBeLessThan(portrait.PIT_CENTER.y);
  expect(landscape.FLOAT_ZONE.bottom).toBeLessThan(portrait.FLOAT_ZONE.bottom);
  expect(landscape.FLOAT_ZONE.right).toBeGreaterThan(portrait.FLOAT_ZONE.right);
});

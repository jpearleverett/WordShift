// PLACEHOLDER for Panko's jars and the fire drawing (S07-S08): a static wide of the house until the shot is built.
import { aim, setAspect, look } from './common.js';

export default async function make(ctx) {
  const { world, camera, E, portrait } = ctx;
  return {
    id: 'S07-S08',
    start: E.S07,
    end: E.S09,
    pose(t) {
      setAspect(camera, portrait);
      const focus = aim(camera, [0, 10, portrait ? 60 : 48], [0, 10, 0], portrait ? 54 : 34);
      const grade = world.pose(t, { camera, focus });
      return { scene: world.scene, camera, look: look(grade, 0, { msaa: false }) };
    },
  };
}

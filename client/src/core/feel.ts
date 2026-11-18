/** Camera and feel tuning. Each phase adds its own numbers from docs/LOOK.md. Nothing else defines feel. */
export const FEEL = {
  /** Vertical field of view in degrees for the first-person camera. */
  fov: 75,
  /** Fixed simulation step, seconds. */
  simStep: 1 / 60,
} as const;

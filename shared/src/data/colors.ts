/** Player color bands (sash + armband on the base cloth). Chosen to stay apart in a dim, orange-lit foundry. */
export const PLAYER_COLORS = ['#d2501c', '#2f78c0', '#3f9a4a', '#d0a828', '#8a46b8', '#c8c4b8'] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

import type { MatchServerMsg, ScoreNet } from '@wih/shared';

/** Dev only (`?scene=net&preview=result|end`): feeds the flow fake server messages so the result beat and the end screen can be shot. */
export function previewMsgs(kind: string, me: number): MatchServerMsg[] {
  const rows: ScoreNet[] = [me, me + 1, me + 2].map((id, i) => ({ id, pts: [7, 12, 3][i], kills: [6, 9, 2][i], deaths: [4, 3, 8][i], lives: [1, 3, 0][i], wins: [1, 2, 0][i], stacks: i === 1 ? 1 : 0 }));
  const f = { ph: 'result' as const, n: 3, at: 0, end: 0, truce: 0, ring: 0, win: me + 1 };
  const carry: MatchServerMsg = {
    t: 'carry', rows: [
      { id: me, blades: [{ family: 'kiem', from: 21, to: 17 }, { family: 'bua', from: 9, to: 5 }], armor: [7, 5] },
      { id: me + 1, blades: [{ family: 'bua', from: 33, to: 29 }], armor: [10, 8] },
      { id: me + 2, blades: [{ family: null, from: 0, to: 0 }], armor: [0, 0] },
    ],
  };
  if (kind === 'result') return [{ t: 'phase', f: { ...f, n: 2 }, rows }, carry];
  if (kind !== 'end') return [];
  return [
    { t: 'phase', f: { ...f, ph: 'end' }, rows },
    { t: 'end', win: me + 1, rows: rows.map((r, i) => ({ ...r, best: [[9, 4, 0], [0, 7, 11], [3, 3, 3]][i] as [number, number, number], relics: [] })) },
  ];
}

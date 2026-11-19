import { BALANCE, type RoomSettings } from '@wih/shared';
import { el, sfx } from '../kit/dom';
import { STR } from '../strings.vi';

const S = STR.lobby.set;
type Key = Exclude<keyof RoomSettings, never>;
interface Row { key: Key; label: string; values: readonly number[]; show: (v: number) => string }
const C = BALANCE.net.choices;

const ROWS: readonly Row[] = [
  { key: 'rounds', label: S.rounds, values: C.rounds, show: S.rounds_n },
  { key: 'roundS', label: S.roundS, values: C.roundS, show: S.time },
  { key: 'lives', label: S.lives, values: C.lives, show: String },
  { key: 'truce', label: S.truce, values: BALANCE.net.truceChoices, show: STR.lobby.seconds },
  { key: 'ring', label: S.ring, values: C.ring, show: (v) => S.ringNames[v] },
  { key: 'maxPlayers', label: S.maxPlayers, values: C.maxPlayers, show: String },
];

/**
 * The six match settings as a grid of cells. The host's cells are buttons that step through the allowed values
 * (wrapping); everyone else sees the same cells as plain read-only text.
 */
export function settingsGrid(cur: RoomSettings, host: boolean, change: (patch: Partial<RoomSettings>) => void, minPlayers: number): HTMLDivElement {
  const g = el('div', 'lb-set');
  for (const r of ROWS) {
    const v = cur[r.key];
    const cell = el(host ? 'button' : 'div', `m-cell${host ? ' is-edit' : ''}`);
    cell.append(el('small', '', r.label), el('b', '', r.show(v)));
    if (host && cell instanceof HTMLButtonElement) {
      cell.type = 'button';
      cell.addEventListener('click', () => {
        const list = r.key === 'maxPlayers' ? r.values.filter((n) => n >= minPlayers) : r.values;
        const i = list.indexOf(v);
        sfx('toggle');
        change({ [r.key]: list[(i + 1) % list.length] });
      });
    }
    g.append(cell);
  }
  return g;
}

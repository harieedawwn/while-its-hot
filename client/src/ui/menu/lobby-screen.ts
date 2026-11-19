import { DEFAULT_SETTINGS, PLAYER_COLORS } from '@wih/shared';
import type { ErrCode } from '@wih/shared';
import type { Screen } from '../../app/screens';
import { profile } from '../../core/profile';
import { createRoom, room, roomExists, RoomClient, type RoomView } from '../../net/client';
import { serverBase } from '../../net/config';
import { normalizeCode } from '@wih/shared';
import { el, sfx } from '../kit/dom';
import { stampedButton } from '../kit/controls';
import { settingsGrid } from './lobby-settings';
import { shutter, toast, type Shutter } from '../kit/panels';
import { STR } from '../strings.vi';
import '../styles/lobby.css';

const L = STR.lobby;

/** Chơi mạng: entry (Tạo phòng / Vào phòng + code) then the room roster (ready, ping, host settings). */
export class LobbyScreen implements Screen {
  private sh: Shutter | null = null;
  private client: RoomClient | null = null;
  private view: RoomView | null = null;
  private myId = 0;
  private seen: Set<number> | null = null;
  private esc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.back(); };
  constructor(private layer: HTMLElement, private onLeave: () => void, private autoJoin?: string, private onStart: () => void = () => {}) {}

  enter(): void {
    addEventListener('keydown', this.esc);
    if (room.current) { this.client = room.current; this.showRoom(); return; }
    if (this.autoJoin === 'DEMO') { this.demo(); return; }
    this.showEntry();
    if (this.autoJoin) void this.join(this.autoJoin);
  }

  /** Dev preview (`?scene=ui-menu&screen=online&code=DEMO&host=0|1`): a fake room, no server. */
  private demo(): void {
    const host = new URLSearchParams(location.search).get('host') !== '0';
    const players = [['Hùng Thợ Rèn', 0, true, false], ['Lan', 3, false, true], ['Minh', 5, false, false], ['Bảo', 7, false, true]].map(([name, color, h, ready], i) => ({ id: i + 1, name: name as string, color: color as number, host: !!h, ready: !!h || !!ready, online: true, ping: 20 + i * 17 }));
    const settings = { ...DEFAULT_SETTINGS, rounds: 3, lives: 5 };
    this.view = { phase: 'lobby', players, settings }; this.myId = host ? 1 : 2;
    this.client = { code: 'KRBN', id: this.myId, view: this.view, send: () => {}, close: () => {} } as unknown as RoomClient;
    this.showRoom();
  }

  private frame(title: string): Shutter {
    this.sh?.root.remove();
    const sh = shutter(this.layer, title, STR.menu.back, () => this.back(), 'm-lob');
    this.sh = sh; return sh;
  }
  private err(code: ErrCode | 'net'): void { sfx('error'); toast(this.layer, L.err[code], true); }

  private showEntry(): void {
    const sh = this.frame(L.title);
    const field = el('input', 'k-field'); field.type = 'text'; field.maxLength = 4; field.placeholder = L.codeHint;
    field.autocomplete = 'off'; field.spellcheck = false; field.setAttribute('aria-label', L.code);
    field.addEventListener('input', () => { field.value = normalizeCode(field.value); });
    field.addEventListener('keydown', (e) => { if (e.key === 'Enter') void this.join(field.value); });
    const acts = el('div', 'm-acts');
    acts.append(stampedButton(L.enter, () => void this.join(field.value)));
    const create = stampedButton(L.create, async () => {
      try { await this.connect(await createRoom(serverBase())); } catch { this.err('net'); }
    });
    sh.body.append(create, el('div', 'm-wait', L.join), field, acts);
  }

  private async join(raw: string): Promise<void> {
    const code = normalizeCode(raw);
    if (code.length !== 4 || !(await roomExists(serverBase(), code))) return this.err('notfound');
    this.connect(code);
  }

  private connect(code: string): void {
    const idx = Math.max(0, PLAYER_COLORS.indexOf(profile.color as (typeof PLAYER_COLORS)[number]));
    const c = new RoomClient(serverBase(), code, { name: profile.name || STR.profile.defaultName, color: idx }, {
      lobby: (v, id) => { this.view = v; this.myId = id; if (room.current !== c) { room.current = c; this.client = c; this.showRoom(); } else this.paint(); },
      start: () => this.onStart(),
      err: (e) => { this.err(e); if (e !== 'bad' && e !== 'host') this.drop(); },
      link: (s) => { if (s === 'retry') toast(this.layer, L.retry); },
    });
    this.client = c; c.connect();
  }

  private drop(): void { this.client?.close(); room.current = null; this.client = null; this.view = null; if (this.sh) this.showEntry(); }

  private roster!: HTMLDivElement; private acts!: HTMLDivElement; private settingsRow!: HTMLDivElement; private count!: HTMLElement;
  private showRoom(): void {
    const sh = this.frame(L.room);
    this.view = this.client?.view ?? this.view; this.myId = this.client?.id ?? this.myId;
    this.seen = null;
    this.roster = el('div', 'm-roster'); this.acts = el('div', 'm-acts'); this.settingsRow = el('div', 'm-side');
    this.count = el('span', 'm-count');
    const head = el('div', 'm-head'), cols = el('div', 'm-cols'), left = el('div', 'm-left');
    head.append(el('div', 'm-code', this.client!.code), this.count);
    left.append(this.roster);
    cols.append(left, this.settingsRow);
    sh.body.append(head, cols);
    this.paint();
  }

  private paint(): void {
    const v = this.view; if (!v || !this.client) return;
    const me = v.players.find((p) => p.id === this.myId), iHost = !!me?.host;
    const ids = new Set(v.players.filter((p) => p.online).map((p) => p.id));
    if (this.seen) {
      if ([...ids].some((id) => !this.seen!.has(id))) sfx('open');
      else if ([...this.seen].some((id) => !ids.has(id))) sfx('close');
    }
    this.seen = ids;
    this.count.textContent = L.count(v.players.length, v.settings.maxPlayers);
    this.roster.replaceChildren(...v.players.map((p) => {
      const r = el('div', `m-pl${p.online ? '' : ' is-off'}`), dot = el('i');
      dot.style.background = PLAYER_COLORS[p.color % PLAYER_COLORS.length];
      r.append(dot, el('span', '', p.name), el('span', 'm-tag', !p.online ? L.offline : p.host ? L.host : p.ready ? L.ready : ''), el('span', 'm-ms', p.online ? L.ping(p.ping) : ''));
      return r;
    }));
    this.acts.replaceChildren();
    if (!iHost && me) this.acts.append(stampedButton(me.ready ? L.notReady : L.ready, () => this.client!.send({ t: 'ready', v: !me.ready })));
    if (iHost) this.acts.append(stampedButton(L.start, () => this.client!.send({ t: 'start' })));
    this.acts.append(stampedButton(L.leave, () => this.back()));
    const grid = settingsGrid(v.settings, iHost, (s) => this.client!.send({ t: 'settings', s }), v.players.length);
    this.settingsRow.replaceChildren(...(v.players.length < 2 ? [el('div', 'm-wait', L.waiting)] : []), grid, this.acts);
  }

  exit(): void { removeEventListener('keydown', this.esc); this.sh?.root.remove(); this.sh = null; }
  back(): boolean { sfx('back'); this.client?.close(); room.current = null; this.client = null; this.onLeave(); return true; }
}

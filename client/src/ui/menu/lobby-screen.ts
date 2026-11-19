import { PLAYER_COLORS } from '@wih/shared';
import type { ErrCode } from '@wih/shared';
import type { Screen } from '../../app/screens';
import { profile } from '../../core/profile';
import { createRoom, room, roomExists, RoomClient, type RoomView } from '../../net/client';
import { serverBase } from '../../net/config';
import { normalizeCode } from '@wih/shared';
import { el, sfx } from '../kit/dom';
import { segmented, stampedButton } from '../kit/controls';
import { shutter, toast, type Shutter } from '../kit/panels';
import { STR } from '../strings.vi';
import '../styles/lobby.css';

const L = STR.lobby;
const TRUCE = [0, 30, 60];

/** Chơi mạng: entry (Tạo phòng / Vào phòng + code) then the room roster (ready, ping, host settings). */
export class LobbyScreen implements Screen {
  private sh: Shutter | null = null;
  private client: RoomClient | null = null;
  private view: RoomView | null = null;
  private myId = 0;
  private esc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.back(); };
  constructor(private layer: HTMLElement, private onLeave: () => void, private autoJoin?: string, private onStart: () => void = () => {}) {}

  enter(): void {
    addEventListener('keydown', this.esc);
    if (room.current) { this.client = room.current; this.showRoom(); return; }
    this.showEntry();
    if (this.autoJoin) void this.join(this.autoJoin);
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

  private roster!: HTMLDivElement; private acts!: HTMLDivElement; private settingsRow!: HTMLDivElement;
  private showRoom(): void {
    const sh = this.frame(L.room);
    this.view = this.client?.view ?? this.view; this.myId = this.client?.id ?? this.myId;
    this.roster = el('div', 'm-roster'); this.acts = el('div', 'm-acts'); this.settingsRow = el('div');
    sh.body.append(el('div', 'm-code', this.client!.code), this.roster, this.settingsRow, this.acts);
    this.paint();
  }

  private paint(): void {
    const v = this.view; if (!v || !this.client) return;
    const me = v.players.find((p) => p.id === this.myId), iHost = !!me?.host;
    this.roster.replaceChildren(...v.players.map((p) => {
      const r = el('div', `m-pl${p.online ? '' : ' is-off'}`), dot = el('i');
      dot.style.background = PLAYER_COLORS[p.color % PLAYER_COLORS.length];
      r.append(dot, el('span', '', p.name), el('span', 'm-tag', !p.online ? L.offline : p.host ? L.host : p.ready ? L.ready : ''), el('span', 'm-ms', p.online ? L.ping(p.ping) : ''));
      return r;
    }));
    this.settingsRow.replaceChildren();
    if (iHost) {
      this.settingsRow.append(segmented(L.truce, TRUCE.map((n) => ({ id: String(n), label: L.seconds(n) })), String(v.settings.truce), (id) => this.client!.send({ t: 'settings', s: { truce: +id } })).root);
    }
    this.acts.replaceChildren();
    if (!iHost && me) this.acts.append(stampedButton(me.ready ? L.notReady : L.ready, () => this.client!.send({ t: 'ready', v: !me.ready })));
    if (iHost) this.acts.append(stampedButton(L.start, () => this.client!.send({ t: 'start' })));
    this.acts.append(stampedButton(L.leave, () => this.back()));
    if (v.players.length < 2) this.acts.before(el('div', 'm-wait', L.waiting));
  }

  exit(): void { removeEventListener('keydown', this.esc); this.sh?.root.remove(); this.sh = null; }
  back(): boolean { sfx('back'); this.client?.close(); room.current = null; this.client = null; this.onLeave(); return true; }
}

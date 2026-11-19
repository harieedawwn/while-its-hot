import * as THREE from 'three';
import { audioSettings, getAudio } from '../audio';
import { EVENTS, EVENT_IDS, type Cat } from '../audio/catalog';
import type { PlayOpts } from '../audio/engine';
import { FEEL } from '../core/feel';
import type { SceneFactory } from './scenes';

/**
 * Audition (phase 11): every sound in docs/AUDIO.md §3 by category. Dot = sourced (recording) / synth (procedural
 * stand-in) / missing. play = one take, x4 = four takes in a row (round-robin), loop rows toggle. The context
 * buttons play short sequences; "space" tests pan, distance and occlusion. Output toggle = Loa điện thoại / Tai nghe.
 * The user listens on the phone and writes notes in docs/AUDIO_NOTES.md.
 */
type Step = [ms: number, ev: string, o?: PlayOpts];
const at = (x: number, z: number) => ({ x, y: 1.6, z });
const CONTEXTS: Record<string, Step[]> = {
  combat: [[0, 'swing_sword', { pitch: 1 }], [150, 'hit_armor'], [320, 'swing_sword', { pitch: 1.06 }], [470, 'hit_armor'], [640, 'swing_sword', { pitch: 1.12 }], [790, 'hit_flesh'],
    [1500, 'parry'], [2300, 'swing_hammer'], [2520, 'hit_blocked'], [3200, 'kill']],
  forge: [[0, 'anvil_place'], [900, 'strike_dat'], [1700, 'strike_tuyet'], [2500, 'strike_giu'], [3200, 'strike_hong'], [4000, 'quench']],
  move: [[0, 'footstep_stone'], [330, 'footstep_stone'], [660, 'footstep_stone'], [990, 'footstep_stone'], [1320, 'jump'], [1900, 'land_hard'], [2300, 'dash'], [2700, 'footstep_slag']],
  space: [[0, 'parry', { pos: at(-6, -8) }], [900, 'parry', { pos: at(6, -8) }], [1800, 'parry', { pos: at(0, -22) }], [2700, 'parry', { pos: at(0, -42) }], [3600, 'parry', { pos: at(0, -14) }]],
  ui: [[0, 'ui_open'], [300, 'ui_tap'], [600, 'ui_notch'], [750, 'ui_notch'], [900, 'ui_notch'], [1200, 'ui_toggle'], [1600, 'ui_back'], [2000, 'ui_error'], [2400, 'ui_close']],
};
const CATS: Cat[] = ['move', 'melee', 'forge', 'module', 'world', 'match', 'amb', 'ui'];
const COLOR = { sourced: '#9bb07a', synth: '#c8a050', missing: '#704038' } as const;

const make: SceneFactory = async ({ pipeline, width, height }) => {
  const audio = getAudio();
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#14110f');
  const camera = new THREE.PerspectiveCamera(FEEL.fov, width / height, 0.1, 50);
  await Promise.race([audio.ready, new Promise((r) => setTimeout(r, 8000))]);

  let occluded = false;
  audio.setOcclusionProbe(() => occluded);
  const timers: number[] = [];
  const loops = new Map<string, { stop(): void }>();

  const css = document.createElement('style');
  css.textContent = `.au{position:fixed;inset:0;overflow:auto;background:#14110f;color:#d8c8b8;font:12px/1.3 monospace;padding:8px 10px;z-index:5}
.au h4{margin:10px 0 3px;color:#a89070;font-weight:normal;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid #3a2a20}
.au .bar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:4px}
.au .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:2px 10px}
.au .row{display:flex;align-items:center;gap:4px;min-height:24px}
.au .row span.id{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.au .dot{width:8px;height:8px;flex:none}
.au button{background:#1f1814;color:#d8c8b8;border:1px solid #5a4030;padding:3px 7px;font:inherit}
.au button.on{background:#5a3a22;border-color:#c8642a}
.au input[type=range]{width:90px}`;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.className = 'au'; document.body.appendChild(root);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, parent: HTMLElement, text = '', cls = ''): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; parent.appendChild(e); return e;
  };

  const bar = el('div', root, '', 'bar');
  el('span', bar, 'audition');
  const out = el('button', bar);
  const setOut = () => { out.textContent = `output: ${audioSettings.output === 'phone' ? 'phone speaker' : 'headphones'}`; };
  out.onclick = () => { audio.setSettings({ output: audioSettings.output === 'phone' ? 'headphones' : 'phone' }); setOut(); };
  setOut();
  const vol = el('input', bar); vol.type = 'range'; vol.min = '0'; vol.max = '1'; vol.step = '0.05'; vol.value = String(audioSettings.master);
  vol.oninput = () => audio.setSettings({ master: Number(vol.value) });
  const occ = el('button', bar, 'occluded: off'); occ.onclick = () => { occluded = !occluded; occ.textContent = `occluded: ${occluded ? 'on' : 'off'}`; occ.className = occluded ? 'on' : ''; };
  const state = el('span', bar);
  const upd = () => { state.textContent = audio.running ? `ctx running, ${audio.pool.all.length} voices` : 'tap anywhere to unlock audio'; };
  const bar2 = el('div', root, '', 'bar'); el('span', bar2, 'context:');
  for (const [name, steps] of Object.entries(CONTEXTS)) {
    const b = el('button', bar2, name);
    b.onclick = () => { for (const [ms, ev, o] of steps) timers.push(window.setTimeout(() => audio.play(ev, o), ms)); };
  }
  const area = el('button', bar2, 'area: hall'); area.onclick = () => { const hall = audio.graph.area === 'hall_foundry'; audio.setArea(hall ? 'room_small' : 'hall_foundry'); area.textContent = `area: ${hall ? 'room' : 'hall'}`; };
  const duck = el('button', bar2, 'duck'); duck.onclick = () => audio.duck();

  const dots: Array<[HTMLElement, string]> = [];
  for (const cat of CATS) {
    el('h4', root, cat);
    const grid = el('div', root, '', 'grid');
    for (const id of EVENT_IDS.filter((i) => EVENTS[i].cat === cat)) {
      const def = EVENTS[id], row = el('div', grid, '', 'row');
      const dot = el('span', row, '', 'dot'); dots.push([dot, id]);
      el('span', row, id, 'id');
      const play = el('button', row, def.loop ? 'loop' : 'play');
      play.onclick = () => {
        if (def.loop) {
          const h = loops.get(id);
          if (h) { h.stop(); loops.delete(id); play.className = ''; } else { const n = audio.loop(id); if (n) { loops.set(id, n); play.className = 'on'; } }
        } else audio.play(id);
      };
      if (!def.loop) { const x4 = el('button', row, 'x4'); x4.onclick = () => { for (let k = 0; k < 4; k++) timers.push(window.setTimeout(() => audio.play(id), k * 420)); }; }
    }
  }
  const paint = () => { for (const [d, id] of dots) { const s = audio.source(id); d.style.background = COLOR[s]; d.title = `${s} (${audio.bank.takes(id)} takes)`; } };
  paint(); upd();
  const tick = window.setInterval(() => { upd(); paint(); }, 500);

  return {
    ready: true,
    update(dt) { audio.update(dt); },
    render() { pipeline.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() { timers.forEach(clearTimeout); clearInterval(tick); loops.forEach((h) => h.stop()); root.remove(); css.remove(); audio.setOcclusionProbe(null); },
  };
};
export default make;

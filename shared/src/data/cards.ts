import type { Family } from './weapons';

/**
 * Cards (Lá bài, ROUND3 §5). Pure data: every field is an effect the engine reads generically (`foldCards`), never
 * switch-cased on the id. Adding a card = one row here + its name/line in strings.vi.ts (+ an icon in card-icons.ts).
 * Two kinds: `weapon` (forge and weapon cards) and `body` (body cards, modules included). `rare` fills the pool last place draws from.
 * A card with `family` only works while a weapon of that family is held.
 */
export interface CardFx {
  /** Forge mods (ForgeMods): multipliers, plus Nhập thần fill rate and extra seconds. */
  costMul: number; decayMul: number; heatMul: number; zoneMul: number; frenzyFillMul: number; frenzyPlusS: number;
  /** Turn this many Vỡ into Giữ each round / make this many Lên a +2 each round. */
  guardVo: number; plus2Once: number;
  /** Mối hàn: after a Vỡ the next Trúng is a sure Lên. */
  sureAfterVo: boolean;
  /** Weapon damage multiplier, and the extra multiplier while below `lowHp` hit points. */
  dmgMul: number; lowHp: number; lowHpDmg: number;
  /** Start each round with this much armor; kills give this many weapon levels; a kill heals this much. */
  armorStart: number; killLevels: number; killHeal: number;
  /** Share of the end-of-round level loss that is kept (Giữ lửa: 0.5 → half is lost). */
  carryMul: number;
  /** A Vỡ knocks everyone within this many meters of your anvil back; place/pick-up of the anvil is instant. */
  wave: number; instantAnvil: boolean;
  /** A parry restores this much stamina / HP; a parry with a sword reflects this share of the blow back. */
  parryStamina: number; parryHp: number; parryReflect: number;
  /** Body: max HP, run speed ×, stamina pips, HP/s after `regenIdleS` untouched, ring burn ×. */
  hpBonus: number; speedMul: number; staminaPips: number; regenHps: number; ringMul: number;
  /** Hồn (ghost): speed × and seconds longer. */
  ghostSpeedMul: number; ghostPlusS: number;
  /** Slam bounce height ×, slide length ×, extra air jumps, hover seconds in the air (hold Nhảy). */
  slamBounceMul: number; slideLen: number; airJumps: number; hoverS: number;
  /** Block arc in degrees (0 = the default) and extra parry window in seconds. */
  blockArc: number; parryPlusS: number;
  /** Heavy charge time × (búa), 4th-hit knock × (găng). */
  chargeMul: number; knockMul: number;
  /** Shoulder gun: seconds between auto shots (0 = none); crossbow: bolts per life; belt bomb: bombs per round. */
  gunEveryS: number; bolts: number; bombs: number;
}
export const NO_CARD: CardFx = {
  costMul: 1, decayMul: 1, heatMul: 1, zoneMul: 1, frenzyFillMul: 1, frenzyPlusS: 0, guardVo: 0, plus2Once: 0, sureAfterVo: false,
  dmgMul: 1, lowHp: 0, lowHpDmg: 1, armorStart: 0, killLevels: 0, killHeal: 0, carryMul: 1, wave: 0, instantAnvil: false,
  parryStamina: 0, parryHp: 0, parryReflect: 0, hpBonus: 0, speedMul: 1, staminaPips: 0, regenHps: 0, ringMul: 1,
  ghostSpeedMul: 1, ghostPlusS: 0, slamBounceMul: 1, slideLen: 1, airJumps: 0, hoverS: 0, blockArc: 0, parryPlusS: 0,
  chargeMul: 1, knockMul: 1, gunEveryS: 0, bolts: 0, bombs: 0,
};

export type CardKind = 'weapon' | 'body';
/** Icon ids (drawn in client/src/ui/hud/card-icons.ts on the touch pictogram grid). */
export type CardIcon =
  | 'anvil' | 'kiem' | 'bua' | 'dao' | 'tay'
  | 'heart' | 'foot' | 'lungs' | 'pulse' | 'skin' | 'ghost' | 'fang' | 'fist' | 'shield' | 'spring' | 'wing' | 'wheel' | 'gun' | 'bow' | 'arm' | 'bomb' | 'plate';
export interface CardDef { id: string; kind: CardKind; icon: CardIcon; rare: boolean; stack: boolean; family?: Family; fx: Partial<CardFx> }

const W = (id: string, icon: CardIcon, fx: Partial<CardFx>, o: { rare?: boolean; stack?: boolean; family?: Family } = {}): CardDef =>
  ({ id, kind: 'weapon', icon, rare: !!o.rare, stack: !!o.stack, family: o.family, fx });
const B = (id: string, icon: CardIcon, fx: Partial<CardFx>, o: { rare?: boolean; stack?: boolean } = {}): CardDef =>
  ({ id, kind: 'body', icon, rare: !!o.rare, stack: !!o.stack, fx });

export const CARDS: readonly CardDef[] = [
  // Vũ khí: the anvil and the blade
  W('mat_tho', 'anvil', { zoneMul: 1.25 }),
  W('ong_be', 'anvil', { heatMul: 2 }),
  W('kim_giu_nhiet', 'anvil', { decayMul: 0.5, costMul: 0.7 }),
  W('da_niem', 'anvil', { guardVo: 3 }),
  W('hon_than_do', 'anvil', { plus2Once: 1 }),
  W('moi_han', 'anvil', { sureAfterVo: true }),
  W('be_lon', 'anvil', { frenzyFillMul: 1.3 }),
  W('lua_lau', 'anvil', { frenzyPlusS: 1 }, { rare: true }),
  W('giu_lua', 'anvil', { carryMul: 0.5 }, { rare: true }),
  W('sat_vun', 'anvil', { killLevels: 1 }, { rare: true }),
  W('bua_nen', 'anvil', { wave: 4 }),
  W('de_nhe', 'anvil', { instantAnvil: true }),
  W('an_sat', 'anvil', { dmgMul: 1.1 }, { stack: true }),
  // Vũ khí: one family
  W('luoi_toi', 'kiem', { parryReflect: 0.5 }, { family: 'kiem' }),
  W('dau_nang', 'bua', { chargeMul: 0.7 }, { family: 'bua' }),
  W('buoc_nhe', 'dao', { airJumps: 1 }, { family: 'dao' }),
  W('dot_ngon', 'tay', { knockMul: 2 }, { family: 'tay' }),
  // Cơ thể
  B('tim_sat', 'heart', { hpBonus: 20 }, { stack: true }),
  B('chan_nhanh', 'foot', { speedMul: 1.08 }),
  B('phoi_be', 'lungs', { staminaPips: 1 }),
  B('hoi_suc', 'pulse', { regenHps: 2 }),
  B('da_lua', 'skin', { ringMul: 0.5 }),
  B('hon_nhanh', 'ghost', { ghostSpeedMul: 1.5, ghostPlusS: 1 }),
  B('hut_mau', 'fang', { killHeal: 25 }),
  B('gan_li', 'fist', { lowHp: 30, lowHpDmg: 1.2 }),
  B('dau_toi', 'shield', { parryStamina: 1, parryHp: 5 }),
  B('lo_xo', 'spring', { slamBounceMul: 2 }),
  B('phan_luc', 'wing', { airJumps: 1, hoverS: 0.6 }, { rare: true }),
  B('banh_lan', 'wheel', { speedMul: 1.12, slideLen: 1.5 }),
  B('sung_may_vai', 'gun', { gunEveryS: 6 }, { rare: true }),
  B('no_vai', 'bow', { bolts: 2 }),
  B('khien_tay', 'arm', { blockArc: 180, parryPlusS: 0.04 }),
  B('binh_no', 'bomb', { bombs: 3 }),
  B('giap_day', 'plate', { armorStart: 2 }),
];
export type CardId = string;
export const CARD_IDS: readonly string[] = CARDS.map((c) => c.id);
const BY_ID = new Map<string, CardDef>(CARDS.map((c) => [c.id, c]));
export const cardById = (id: string): CardDef | undefined => BY_ID.get(id);
export const isCard = (id: string): boolean => BY_ID.has(id);

/**
 * Combine a player's cards (duplicates are stackable cards): multipliers multiply, counts and amounts add, flags or,
 * waves/arcs/limits take the max. Family cards count only while `family` (the held weapon's) matches.
 */
export function foldCards(ids: readonly string[], family: Family | null = null): CardFx {
  const o: CardFx = { ...NO_CARD };
  for (const id of ids) {
    const c = BY_ID.get(id); if (!c || (c.family && c.family !== family)) continue;
    const f = c.fx;
    o.costMul *= f.costMul ?? 1; o.decayMul *= f.decayMul ?? 1; o.heatMul *= f.heatMul ?? 1; o.zoneMul *= f.zoneMul ?? 1;
    o.frenzyFillMul *= f.frenzyFillMul ?? 1; o.frenzyPlusS += f.frenzyPlusS ?? 0; o.dmgMul *= f.dmgMul ?? 1;
    o.guardVo += f.guardVo ?? 0; o.plus2Once += f.plus2Once ?? 0; o.sureAfterVo ||= f.sureAfterVo ?? false;
    o.lowHp = Math.max(o.lowHp, f.lowHp ?? 0); o.lowHpDmg *= f.lowHpDmg ?? 1;
    o.armorStart += f.armorStart ?? 0; o.killLevels += f.killLevels ?? 0; o.killHeal += f.killHeal ?? 0; o.carryMul *= f.carryMul ?? 1;
    o.wave = Math.max(o.wave, f.wave ?? 0); o.instantAnvil ||= f.instantAnvil ?? false;
    o.parryStamina += f.parryStamina ?? 0; o.parryHp += f.parryHp ?? 0; o.parryReflect += f.parryReflect ?? 0;
    o.hpBonus += f.hpBonus ?? 0; o.speedMul *= f.speedMul ?? 1; o.staminaPips += f.staminaPips ?? 0; o.regenHps += f.regenHps ?? 0; o.ringMul *= f.ringMul ?? 1;
    o.ghostSpeedMul *= f.ghostSpeedMul ?? 1; o.ghostPlusS += f.ghostPlusS ?? 0;
    o.slamBounceMul *= f.slamBounceMul ?? 1; o.slideLen *= f.slideLen ?? 1; o.airJumps += f.airJumps ?? 0; o.hoverS = Math.max(o.hoverS, f.hoverS ?? 0);
    o.blockArc = Math.max(o.blockArc, f.blockArc ?? 0); o.parryPlusS += f.parryPlusS ?? 0;
    o.chargeMul *= f.chargeMul ?? 1; o.knockMul *= f.knockMul ?? 1;
    o.gunEveryS = o.gunEveryS > 0 && (f.gunEveryS ?? 0) > 0 ? Math.min(o.gunEveryS, f.gunEveryS!) : Math.max(o.gunEveryS, f.gunEveryS ?? 0);
    o.bolts += f.bolts ?? 0; o.bombs += f.bombs ?? 0;
  }
  return o;
}
/** True when folding this card alone changes any number (the "every card has an effect" check). */
export function cardChanges(id: string): boolean {
  const c = BY_ID.get(id); if (!c) return false;
  const f = foldCards([id], c.family ?? null);
  return (Object.keys(NO_CARD) as (keyof CardFx)[]).some((k) => f[k] !== NO_CARD[k]);
}

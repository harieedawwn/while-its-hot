import type { Fighter, FighterPhase } from '@wih/shared';
import { attackId, CLIP_FAMILY } from '../player/character/clips';
import type { Character } from '../player/character/character';

/**
 * Fighter state → third-person clips (LOOK §4) for dummies and the third-person body. Call `sync` after
 * every fighter tick: it starts clips on phase changes and new swings; clip lengths already match the
 * frame data, so the body strikes when the rules strike. `hitFrom` picks hit_f / hit_b for flinches.
 */
export class FighterAnim {
  private phase: FighterPhase = 'idle';
  private swing = -1;
  /** Set by the owner before sync when a hit lands: true = hit from behind. */
  hitFromBack = false;

  constructor(private ch: Character) {}

  sync(f: Fighter): void {
    const fam = CLIP_FAMILY[f.weapon.stats.moveset], a = this.ch.anim;
    const p = f.phase, changed = p !== this.phase, swung = f.swingId !== this.swing;
    if (!changed && !swung) return;
    const prev = this.phase;
    this.phase = p; this.swing = f.swingId;
    switch (p) {
      case 'windup':
        if (f.kind === 'heavy') a.play(attackId(fam, 'heavy_release'), { fadeIn: 0.03 });
        else if (f.kind === 'dash') a.play(attackId(fam, 'dash'), { fadeIn: 0.03 });
        else a.play(attackId(fam, `light${f.combo + 1}` as 'light1'), { fadeIn: 0.05 });
        break;
      case 'charge': a.play(attackId(fam, 'heavy_charge'), { hold: true, fadeIn: 0.08 }); break;
      case 'parry': a.play('parry', { fadeIn: 0.03 }); break;
      case 'block': a.play('block', { hold: true, fadeIn: 0.05 }); break;
      case 'stagger': a.play('stagger', { fadeIn: 0.04 }); break;
      case 'flinch': a.play(this.hitFromBack ? 'hit_b' : 'hit_f', { fadeIn: 0.02 }); break;
      case 'dead': a.play('death', { hold: true, fadeIn: 0.05 }); break;
      case 'idle':
        if (prev === 'block' || prev === 'dead' || prev === 'charge') a.stop(prev === 'dead' ? 0 : undefined);
        break;
      default: break;
    }
  }
}

import { el, onPress, sfx } from './dom';
import { notchedSlider, type Slider } from './controls';

/** Slider over a real range: `step` apart, value shown through `fmt`. */
export function rangeSlider(label: string, min: number, max: number, step: number, value: number, onChange: (v: number) => void, fmt: (v: number) => string = (v) => String(v)): Slider {
  const steps = Math.round((max - min) / step);
  const val = (i: number) => +(min + i * step).toFixed(4);
  return notchedSlider(label, steps, Math.round((value - min) / step), (i) => onChange(val(i)), (i) => fmt(val(i)));
}

/** Stamped single-line text field (profile name). */
export function textField(label: string, value: string, max: number, placeholder: string, onChange: (v: string) => void): HTMLInputElement {
  const i = el('input', 'k-field');
  i.type = 'text'; i.value = value; i.maxLength = max; i.placeholder = placeholder;
  i.setAttribute('aria-label', label);
  i.autocomplete = 'off'; i.spellcheck = false;
  i.addEventListener('input', () => onChange(i.value));
  return i;
}

/** A row of flat color squares; the chosen one gets a bone frame. */
export function swatches(label: string, colors: readonly string[], value: string, onChange: (c: string) => void, names: (i: number) => string): HTMLDivElement {
  const root = el('div', 'k-swatches');
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', label);
  const cells = colors.map((c, i) => {
    const b = el('button', 'k-sw');
    b.type = 'button'; b.style.background = c;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-label', names(i));
    onPress(b, () => { sfx('toggle'); mark(c); onChange(c); });
    root.appendChild(b);
    return b;
  });
  const mark = (v: string) => cells.forEach((b, i) => b.setAttribute('aria-checked', String(colors[i] === v)));
  mark(value);
  return root;
}

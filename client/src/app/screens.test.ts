import { describe, expect, it } from 'vitest';
import { ScreenMachine, type Screen } from './screens';

const log: string[] = [];
const scr = (id: string, back = false): Screen => ({
  enter: (from) => { log.push(`enter ${id} from ${from}`); },
  exit: () => { log.push(`exit ${id}`); },
  back: back ? () => { log.push(`back ${id}`); return true; } : undefined,
});

describe('ScreenMachine', () => {
  it('cuts between screens: exit old, then enter new with its origin', async () => {
    log.length = 0;
    const m = new ScreenMachine().add('title', scr('title')).add('menu', scr('menu', true));
    await m.go('title', 'cut');
    await m.go('menu', 'cut');
    await m.go('menu', 'cut'); // same screen: no-op
    await m.go('nope', 'cut'); // unknown: no-op
    expect(log).toEqual(['enter title from null', 'exit title', 'enter menu from title']);
    expect(m.current).toBe('menu');
    expect(m.back()).toBe(true);
    expect(log.at(-1)).toBe('back menu');
  });
  it('back is false when the screen has no handler', async () => {
    const m = new ScreenMachine().add('a', scr('a'));
    await m.go('a', 'cut');
    expect(m.back()).toBe(false);
  });
});

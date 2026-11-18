import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
describe('balance', () => {
  it('uses the documented eye height', () => expect(BALANCE.eyeHeight).toBe(1.62));
});

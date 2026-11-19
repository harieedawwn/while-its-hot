/**
 * Cooperative yielding for scene loads: split a long build into slices so the page can paint (the transition
 * overlay keeps animating on its own clock) instead of freezing for the whole build.
 */
const chan = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
const waiting: (() => void)[] = [];
if (chan) chan.port1.onmessage = () => { waiting.shift()?.(); };

/** Resolve on a later task (not a whole frame): the browser may paint and handle input in between. */
export function yieldTask(): Promise<void> {
  if (!chan) return new Promise((r) => setTimeout(r, 0));
  return new Promise((r) => { waiting.push(r); chan.port2.postMessage(0); });
}

/** Resolve after `good` consecutive animation frames shorter than `maxMs` (or `cap` frames, whichever first). */
export function settleFrames(good = 2, maxMs = 34, cap = 90): Promise<void> {
  return new Promise((resolve) => {
    let last = 0, ok = 0, n = 0;
    const tick = (t: number) => {
      if (last) ok = t - last <= maxMs ? ok + 1 : 0;
      last = t;
      if (ok >= good || ++n >= cap) resolve(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

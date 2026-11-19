/**
 * Forge HUD styles (LOOK §8): stamped steel — hard edges, 8 px chamfers, flat fills, no gradients or glow.
 * Tokens are the LOOK palette; phase 13 moves them to tokens.css and these fall back to the same hexes.
 */
export const FORGE_CSS = `
.fh{position:absolute;inset:0;pointer-events:none;z-index:6;
  --soot:#0d0b0a;--slag:#1c1917;--ash:#3a3430;--bone:#e9e1d3;--hot:#f26a1b;--steel:#7f93a1;--oxide:#b3261e;
  font-family:'Big Shoulders Display','Arial Narrow',Impact,sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.04em;
  font-variant-numeric:tabular-nums;color:var(--bone);
  left:max(env(safe-area-inset-left),var(--cut-l,0px));right:max(env(safe-area-inset-right),var(--cut-r,0px));
  top:max(env(safe-area-inset-top),var(--cut-t,0px));bottom:max(env(safe-area-inset-bottom),var(--cut-b,0px))}
.fh[hidden]{display:none}
.fh-col{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:7px}
.fh-row{display:flex;align-items:center;gap:16px}
.fh-ring{width:88px;height:88px;display:block}
.fh-ring .tr{fill:none;stroke:var(--ash);stroke-width:7}
.fh-ring .zn{fill:none;stroke:var(--bone);stroke-width:7}
.fh-ring .mk{stroke:var(--hot);stroke-width:4}
.fh-ring.cd .mk{stroke:var(--steel)}
.fh-ring .dot{fill:var(--soot);stroke:var(--ash);stroke-width:2}
.fh-lvl{min-width:78px;text-align:right;line-height:1.05}
.fh-lvl b{display:block;font-size:44px;font-weight:900;line-height:1}
.fh-lvl i{font-style:normal;font-size:15px;color:var(--steel)}
.fh-fr{min-width:78px;font-size:15px;line-height:1.3;color:var(--hot);opacity:0}
.fh-fr.on{opacity:1}
.fh-heat{position:relative;display:flex;gap:2px;width:216px;padding:3px;background:var(--soot);outline:2px solid var(--ash);
  clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.fh-heat u{flex:1;height:12px;background:var(--slag)}
.fh-band{position:relative;width:216px;height:6px}
.fh-band i{position:absolute;top:0;height:6px;border:2px solid var(--bone);border-top:0}
.fh-pips{display:flex;gap:3px}
.fh-pips u{width:14px;height:6px;background:var(--slag);outline:1px solid var(--ash)}
.fh-pips u.on{background:var(--hot);outline-color:var(--hot)}
.fh-word{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);font-size:46px;font-weight:900;line-height:1.2;white-space:nowrap;opacity:0}
.fh-word.pop{animation:fhpop var(--flash,.8s) steps(1,end) 1 both}
@keyframes fhpop{0%{opacity:1;transform:translateX(-50%) scale(1.3)}12%{opacity:1;transform:translateX(-50%) scale(1.12)}24%{opacity:1;transform:translateX(-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) scale(1)}}
.fh-pick{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px}
.fh-tags{display:flex;gap:12px}
.fh-tag{pointer-events:auto;position:relative;width:118px;height:84px;box-sizing:border-box;padding:8px 10px;overflow:hidden;white-space:nowrap;background:var(--slag);outline:3px solid var(--ash);
  display:flex;flex-direction:column;justify-content:space-between;font-size:25px;font-weight:900;line-height:1.2;touch-action:manipulation;cursor:pointer;
  clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.fh-tag small{font-size:15px;color:var(--steel);font-weight:800}
.fh-tag.def{background:var(--hot);color:var(--soot);outline-color:var(--hot)}
.fh-tag.def small{color:var(--soot)}
.fh-tag:active{background:var(--hot);color:var(--soot)}
.fh-count{width:100%;height:6px;background:var(--ash)}
.fh-count i{display:block;height:100%;background:var(--bone);transform-origin:left;animation:fhcount var(--pick,3s) linear 1 both}
@keyframes fhcount{from{transform:scaleX(1)}to{transform:scaleX(0)}}
`;

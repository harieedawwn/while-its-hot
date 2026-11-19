/**
 * Touch control styles (LOOK §8): machined steel discs. No gradients and no blur: the bevel is stacked hard
 * inset rings (dark groove under the bone outline, a lit upper lip), pressed = sunk + --iron-hot fill.
 * Palette: soot #0d0b0a, slag #1c1917, ash #3a3430, bone #e9e1d3, iron-hot #f26a1b, steel #7f93a1, oxide #b3261e.
 */
export const TOUCH_CSS = `
.tc{position:absolute;inset:0;touch-action:none;-webkit-user-select:none;user-select:none;z-index:5}
.tc-safe{position:absolute;pointer-events:none;
  left:max(env(safe-area-inset-left),var(--cut-l,0px));right:max(env(safe-area-inset-right),var(--cut-r,0px));
  top:max(env(safe-area-inset-top),var(--cut-t,0px));bottom:max(env(safe-area-inset-bottom),var(--cut-b,0px))}
.tb{position:absolute;left:0;top:0;pointer-events:none;color:#e9e1d3;transition:opacity .14s linear}
.tb .face{position:absolute;inset:0;box-sizing:border-box;border-radius:50%;background:#1c1917b3;border:2px solid #e9e1d3;
  box-shadow:inset 0 0 0 3px #0d0b0ac0,inset 0 2px 0 4px #e9e1d330,inset 0 -2px 0 4px #0d0b0a80;
  display:flex;align-items:center;justify-content:center;transition:transform .14s ease-out}
.tb .pg{width:54%;height:54%;display:block}
.tb.on .face{background:#f26a1b;color:#0d0b0a;border-color:#f26a1b;transform:scale(.94);
  box-shadow:inset 0 0 0 3px #0d0b0a50,inset 0 3px 0 3px #0d0b0a70;transition:none}
.tb.on .face .pg{transform:translateY(1px)}
.tb.off{opacity:0 !important}
.tb.off .face{transform:scale(.8)}
.tb .rim{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.tb .rim circle{stroke:#7f93a1;transition:stroke-dasharray 40ms linear}
.tb.rim-charge .rim circle{stroke:#e9e1d3}
.tb.rim-full .rim circle{stroke:#f26a1b}
.tb.stick .face{background:#1c19178c;color:#e9e1d3}
.tb.stick .sb{position:absolute;inset:0;width:100%;height:100%}
.tb.stick.held .face{background:#1c1917b3}
.tb .knob{position:absolute;left:50%;top:50%;width:42%;height:42%;margin:-21% 0 0 -21%;box-sizing:border-box;border-radius:50%;
  background:#3a3430;border:2px solid #e9e1d3;box-shadow:inset 0 0 0 3px #1c1917,inset 0 2px 0 5px #e9e1d340,0 0 0 2px #0d0b0a}
.tb .knob::after{content:"";position:absolute;left:50%;top:50%;width:18%;height:18%;margin:-9% 0 0 -9%;border-radius:50%;background:#0d0b0a}
.tb.stick.held .knob{border-color:#f26a1b}
.tc.edit{pointer-events:none}
.modal-open .tc{pointer-events:none;visibility:hidden}
.tc.edit .tb{pointer-events:auto;cursor:grab;touch-action:none}
.tc.edit .tb .face{outline:2px dashed #7f93a1;outline-offset:3px}
.tc.edit .tb.sel .face{border-color:#f26a1b;outline-color:#f26a1b;outline-style:solid}
.tc.edit .tb.bad .face{border-color:#b3261e;outline-color:#b3261e}
`;

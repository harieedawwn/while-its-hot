import { HEAT_HEX } from '../render/heat';

/**
 * The transition overlay's one WebGL1 program (LOOK §9): a low-res, pixelated canvas above everything.
 * Modes: 1 quench cover · 2 quench uncover · 3 stamp halves (snapshot) · 4 bone flash · 5 dithered fade.
 * Colors are sRGB straight from the tokens and the heat ramp (no gradients: every color is a discrete step).
 */
const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uMode; uniform float uT;
uniform vec2 uOrigin; uniform float uMaxF; uniform float uEdge; uniform float uNoise;
uniform vec3 uRamp[9]; uniform vec3 uSoot; uniform vec3 uBone; uniform float uSeed;
uniform sampler2D uSnap; uniform float uOpen; uniform float uRot; uniform float uJag; uniform float uTeeth; uniform float uCrackX;
float b2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer(vec2 a) { return b2(0.5 * a) * 0.25 + b2(a); }
float h1(float n) { return fract(sin(n * 91.345 + uSeed * 17.17) * 43758.5453); }
float h2(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7)) + uSeed * 7.31) * 43758.5453); }
float vnoise(vec2 q) {
  vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
vec3 ramp(float k) {
  if (k < 0.5) return uRamp[8]; if (k < 1.5) return uRamp[6]; if (k < 2.5) return uRamp[4];
  if (k < 3.5) return uRamp[3]; if (k < 4.5) return uRamp[2]; return uSoot;
}
float crack(float y) {
  float t = y * uTeeth; float i = floor(t); float f = fract(t);
  float a = h1(i) - 0.5, b = h1(i + 1.0) - 0.5;
  // sharp teeth: alternate sides, linear between (a jagged break, not a wave)
  a *= mod(i, 2.0) * 2.0 - 1.0; b *= mod(i + 1.0, 2.0) * 2.0 - 1.0;
  return uCrackX + (mix(a, b, f) * 2.0 + (y - 0.5) * 0.25) * uJag;
}
void main() {
  vec2 px = gl_FragCoord.xy;
  float th = bayer(px);
  if (uMode > 4.5) { if (uT <= th) discard; gl_FragColor = vec4(uSoot, 1.0); return; }
  if (uMode > 3.5) { gl_FragColor = vec4(uBone, 1.0); return; }
  if (uMode > 2.5) {
    float asp = uRes.x / uRes.y;
    vec2 P = vec2(px.x / uRes.y, px.y / uRes.y);
    for (int k = 0; k < 2; k++) {
      float s = k == 0 ? -1.0 : 1.0;
      vec2 piv = vec2(k == 0 ? 0.0 : asp, 0.0);
      float ang = -s * uRot * uT;
      vec2 r = P - piv - vec2(s * uOpen * asp * uT, -0.04 * uT);
      float c = cos(-ang), sn = sin(-ang);
      vec2 Q = vec2(c * r.x - sn * r.y, sn * r.x + c * r.y) + piv;
      if (Q.x < 0.0 || Q.x > asp || Q.y < 0.0 || Q.y > 1.0) continue;
      float cx = crack(Q.y) * asp;
      float side = Q.x - cx;
      if (s * side < 0.0) continue;
      float edge = abs(side) * uRes.y;
      vec3 col = texture2D(uSnap, vec2(Q.x / asp, Q.y)).rgb;
      // halves darken in two hard steps as they fall away; the break glows one ramp step, then cools
      col *= uT > 0.55 ? 0.55 : uT > 0.2 ? 0.75 : 1.0;
      if (edge < 1.5) col = uT < 0.3 ? uRamp[7] : uT < 0.6 ? uRamp[5] : uRamp[3];
      gl_FragColor = vec4(col, 1.0); return;
    }
    discard;
  }
  float f = length(px - uOrigin) + vnoise(px / 22.0) * uNoise + vnoise(px / 6.0) * uNoise * 0.18;
  float d = uT * uMaxF - f + (th - 0.5) * 2.5;
  if (uMode < 1.5) {
    if (d < 0.0) discard;
    gl_FragColor = vec4(ramp(floor(d / uEdge)), 1.0);
  } else {
    if (d >= 0.0) discard;
    gl_FragColor = vec4(-d < uEdge ? uRamp[3] : -d < uEdge * 2.0 ? uRamp[2] : uSoot, 1.0);
  }
}`;

const rgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export interface WipeUniforms {
  mode: number; t: number; origin: [number, number]; maxF: number; edge: number; noise: number; seed: number;
  open: number; rot: number; jag: number; teeth: number; crackX: number;
}

export class TransitionGL {
  readonly canvas = document.createElement('canvas');
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private loc = new Map<string, WebGLUniformLocation | null>();
  private tex: WebGLTexture;

  constructor(soot: string, bone: string) {
    const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('transition: no WebGL');
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`transition shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    this.prog = p;
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(p, 'p');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(this.u('uRamp'), new Float32Array(HEAT_HEX.flatMap(rgb)));
    gl.uniform3fv(this.u('uSoot'), rgb(soot));
    gl.uniform3fv(this.u('uBone'), rgb(bone));
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([13, 11, 10, 255]));
    gl.uniform1i(this.u('uSnap'), 0);
  }

  private u(n: string): WebGLUniformLocation | null {
    if (!this.loc.has(n)) this.loc.set(n, this.gl.getUniformLocation(this.prog, n));
    return this.loc.get(n)!;
  }

  size(w: number, h: number): void { if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; } }

  /** Copy the game canvas (call right after it rendered, same task: the drawing buffer is still valid). */
  snapshot(src: TexImageSource): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch { /* tainted or lost: halves show soot */ }
  }

  draw(o: WipeUniforms): void {
    const gl = this.gl, W = this.canvas.width, H = this.canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u('uRes'), W, H);
    gl.uniform1f(this.u('uMode'), o.mode); gl.uniform1f(this.u('uT'), o.t);
    gl.uniform2f(this.u('uOrigin'), o.origin[0], o.origin[1]);
    gl.uniform1f(this.u('uMaxF'), o.maxF); gl.uniform1f(this.u('uEdge'), o.edge); gl.uniform1f(this.u('uNoise'), o.noise);
    gl.uniform1f(this.u('uSeed'), o.seed);
    gl.uniform1f(this.u('uOpen'), o.open); gl.uniform1f(this.u('uRot'), o.rot); gl.uniform1f(this.u('uJag'), o.jag);
    gl.uniform1f(this.u('uTeeth'), o.teeth); gl.uniform1f(this.u('uCrackX'), o.crackX);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

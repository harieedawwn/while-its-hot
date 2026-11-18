/**
 * The PSX program. Per-vertex: hemisphere + 1 directional + 4 point lights (Lambert, Gouraud banding is the
 * look), optional vertex snap. Per-pixel: texture × vertex color × tint, stepped heat emission, linear fog.
 * One program for the whole world: untextured materials bind a 1×1 white map, heat is a uniform (0 = off).
 */
export const PSX_VERT = /* glsl */ `
uniform vec3 uHemiSky;
uniform vec3 uHemiGround;
uniform vec3 uDirDir;
uniform vec3 uDirColor;
uniform vec4 uPL[4];   // xyz world position, w range (0 = unused)
uniform vec3 uPLc[4];  // linear color × intensity
uniform vec2 uSnap;    // vertex snap grid in clip pixels (0 = off)
attribute float heatMask;
varying vec3 vLight;
varying vec3 vColor;
varying vec2 vUv;
varying float vFogDepth;
varying float vHeatMask;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 L = mix(uHemiGround, uHemiSky, n.y * 0.5 + 0.5);
  L += uDirColor * max(dot(n, uDirDir), 0.0);
  for (int i = 0; i < 4; i++) {
    vec3 d = uPL[i].xyz - wp.xyz;
    float dist = length(d);
    float a = clamp(1.0 - dist / max(uPL[i].w, 1e-3), 0.0, 1.0);
    L += uPLc[i] * (a * a) * max(dot(n, d / max(dist, 1e-4)), 0.0);
  }
  vLight = L;
#ifdef USE_COLOR
  vColor = color;
#else
  vColor = vec3(1.0);
#endif
  vUv = uv;
  vHeatMask = heatMask;
  vec4 mv = viewMatrix * wp;
  vFogDepth = -mv.z;
  vec4 cp = projectionMatrix * mv;
  if (uSnap.x > 0.0) {
    vec2 ndc = cp.xy / cp.w;
    cp.xy = (floor(ndc * uSnap + 0.5) / uSnap) * cp.w;
  }
  gl_Position = cp;
}
`;

export const PSX_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 uTint;
uniform float uUnlit;
uniform float uHeat;
uniform vec3 uHeatRamp[9];
uniform vec3 uFogColor;
uniform vec2 uFog;     // near, far
varying vec3 vLight;
varying vec3 vColor;
varying vec2 vUv;
varying float vFogDepth;
varying float vHeatMask;

void main() {
  vec3 albedo = texture2D(map, vUv).rgb * vColor * uTint;
  vec3 c = albedo * mix(vLight, vec3(1.0), uUnlit);
  float h = clamp(uHeat * vHeatMask, 0.0, 1.0);
  if (h > 0.0) {
    int i = int(min(8.0, floor(h * 9.0)));
    // stepped emission strength: dull red barely shows on the metal, yellow-white replaces it entirely
    float g = min(1.0, floor(h * 9.0 + 1.0) / 6.0);
    c = mix(c, uHeatRamp[i], g);
  }
  float f = clamp((vFogDepth - uFog.x) / max(uFog.y - uFog.x, 1e-3), 0.0, 1.0);
  c = mix(c, uFogColor, f);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

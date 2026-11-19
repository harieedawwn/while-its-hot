/**
 * GLSL shared by the effect shaders: the 4×4 Bayer threshold (screen-door transparency in the low-res pass,
 * never blended), the stepped heat-ramp lookup and linear fog. Same matrix as the post pass.
 */
export const FX_COMMON = /* glsl */ `
uniform vec3 uHeatRamp[9];
uniform vec3 uFogColor;
uniform vec2 uFog;
float bayer4(vec2 p) {
  ivec2 q = ivec2(mod(p, 4.0));
  int i = q.x + q.y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
/** Screen-door alpha in 4 steps: discard the fragment if it falls under the dither threshold. */
void ditherClip(float a) {
  float s = floor(clamp(a, 0.0, 1.0) * 4.0 + 0.5) / 4.0;
  if (s <= bayer4(gl_FragCoord.xy)) discard;
}
vec3 heatRamp(float h) { return uHeatRamp[int(clamp(floor(h * 9.0), 0.0, 8.0))]; }
vec3 applyFog(vec3 c, float depth) {
  float f = clamp((depth - uFog.x) / max(uFog.y - uFog.x, 1e-3), 0.0, 1.0);
  return mix(c, uFogColor, f);
}
`;

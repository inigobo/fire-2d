const head = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
`;

// Manual interpolation keeps the simulation smooth even when half-float linear
// texture filtering is unavailable on a particular WebGL2 device.
const sampling = `
vec4 sampleField(sampler2D field, vec2 uv) {
  vec2 size = vec2(textureSize(field, 0));
  vec2 at = clamp(uv * size - 0.5, vec2(0.0), size - 1.0);
  ivec2 low = ivec2(floor(at));
  ivec2 high = min(low + ivec2(1), ivec2(size) - ivec2(1));
  vec2 w = fract(at);
  vec4 a = mix(texelFetch(field, low, 0), texelFetch(field, ivec2(high.x, low.y), 0), w.x);
  vec4 b = mix(texelFetch(field, ivec2(low.x, high.y), 0), texelFetch(field, high, 0), w.x);
  return mix(a, b, w.y);
}
`;

export const shaders = {
  advect: head + sampling + `
uniform sampler2D uField, uVelocity;
uniform float uDt, uDecayX, uDecayY;
void main() {
  vec2 from = vUv - uDt * sampleField(uVelocity, vUv).xy;
  vec4 value = sampleField(uField, from);
  value.x *= exp(-uDecayX * uDt);
  value.y *= exp(-uDecayY * uDt);
  outColor = value;
}`,

  source: head + `
uniform sampler2D uField;
uniform float uTime, uDt, uIntensity;
uniform vec2 uCenter, uRadius, uValues;
void main() {
  vec4 previous = texture(uField, vUv);
  vec2 position = vUv;
  // Different scales make the emitter breathe instead of drawing a fixed oval.
  float sway = sin(uTime * 2.3) * 0.013 + sin(uTime * 4.1 + 1.7) * 0.008;
  vec2 center = uCenter + vec2(sway, 0.0);
  vec2 delta = (position - center) / uRadius;
  float core = exp(-dot(delta, delta) * 2.5);
  float shoulder = exp(-dot((position - center - vec2(0.0, 0.024)) / (uRadius * vec2(1.5, 1.7)),
                            (position - center - vec2(0.0, 0.024)) / (uRadius * vec2(1.5, 1.7))) * 2.0);
  float flicker = 0.78 + 0.18 * sin(uTime * 13.0) + 0.12 * sin(uTime * 23.1 + 2.0);
  outColor = previous + vec4(uValues * (core + shoulder * 0.23) * uIntensity * flicker * uDt, 0.0, 0.0);
}`,

  splat: head + `
uniform sampler2D uField;
uniform vec2 uPoint, uValue;
uniform float uRadius, uAspect;
void main() {
  vec2 delta = vUv - uPoint;
  delta.x *= uAspect;
  float brush = exp(-dot(delta, delta) / max(0.00001, uRadius * uRadius));
  outColor = texture(uField, vUv) + vec4(uValue * brush, 0.0, 0.0);
}`,

  force: head + `
uniform sampler2D uVelocity, uMatter;
uniform float uDt, uRise, uTime;
void main() {
  vec2 velocity = texture(uVelocity, vUv).xy;
  vec2 matter = texture(uMatter, vUv).xy;
  float core = exp(-pow((vUv.x - 0.5) / 0.12, 2.0) - pow((vUv.y - 0.08) / 0.09, 2.0));
  float wave = sin(vUv.y * 31.0 + uTime * 2.4) * sin(vUv.x * 19.0 - uTime * 1.3);
  vec2 acceleration = vec2(wave * 0.006 * matter.x, (0.06 + uRise * 0.35) * matter.x + core * 0.18);
  outColor = vec4(velocity + acceleration * uDt, 0.0, 0.0);
}`,

  curl: head + `
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  outColor = vec4((right - left) / (2.0 * uTexel.x) - (top - bottom) / (2.0 * uTexel.y), 0.0, 0.0, 0.0);
}`,

  vorticity: head + `
uniform sampler2D uVelocity, uCurl;
uniform vec2 uTexel;
uniform float uDt, uStrength;
void main() {
  float left = abs(texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x);
  float right = abs(texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x);
  float bottom = abs(texture(uCurl, vUv - vec2(0.0, uTexel.y)).x);
  float top = abs(texture(uCurl, vUv + vec2(0.0, uTexel.y)).x);
  vec2 gradient = vec2(right - left, top - bottom);
  gradient /= length(gradient) + 0.0001;
  float spin = texture(uCurl, vUv).x;
  vec2 restoring = vec2(gradient.y, -gradient.x) * spin * uStrength * 0.003;
  outColor = vec4(texture(uVelocity, vUv).xy + restoring * uDt, 0.0, 0.0);
}`,

  divergence: head + `
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  vec2 left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).xy;
  vec2 right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).xy;
  vec2 bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).xy;
  vec2 top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).xy;
  float div = (right.x - left.x) / (2.0 * uTexel.x) + (top.y - bottom.y) / (2.0 * uTexel.y);
  outColor = vec4(div, 0.0, 0.0, 0.0);
}`,

  pressure: head + `
uniform sampler2D uPressure, uDivergence;
uniform vec2 uTexel;
uniform float uDt;
void main() {
  float xWeight = 1.0 / (uTexel.x * uTexel.x);
  float yWeight = 1.0 / (uTexel.y * uTexel.y);
  float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float div = texture(uDivergence, vUv).x;
  float result = ((left + right) * xWeight + (bottom + top) * yWeight - div / uDt) /
                 (2.0 * (xWeight + yWeight));
  outColor = vec4(result, 0.0, 0.0, 0.0);
}`,

  project: head + `
uniform sampler2D uVelocity, uPressure;
uniform vec2 uTexel;
uniform float uDt;
void main() {
  float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 gradient = vec2((right - left) / (2.0 * uTexel.x), (top - bottom) / (2.0 * uTexel.y));
  outColor = vec4(texture(uVelocity, vUv).xy - gradient * uDt, 0.0, 0.0);
}`,

  display: head + sampling + `
uniform sampler2D uMatter;
uniform float uGlow, uAspect, uTime;

vec3 flame(vec2 m) {
  float heat = clamp(m.x, 0.0, 1.8);
  float density = clamp(m.y, 0.0, 1.7);
  vec3 deep = vec3(0.27, 0.016, 0.028);
  vec3 red = vec3(0.78, 0.055, 0.025);
  vec3 amber = vec3(1.0, 0.31, 0.055);
  vec3 gold = vec3(1.0, 0.73, 0.24);
  vec3 white = vec3(1.0, 0.96, 0.72);
  vec3 c = mix(deep, red, smoothstep(0.06, 0.42, heat));
  c = mix(c, amber, smoothstep(0.3, 0.78, heat));
  c = mix(c, gold, smoothstep(0.65, 1.16, heat));
  c = mix(c, white, smoothstep(1.0, 1.6, heat));
  return c * (1.0 - exp(-density * 2.0));
}

void main() {
  vec2 uv = vUv;
  vec2 m = max(sampleField(uMatter, uv).xy, vec2(0.0));
  // A few broad samples create a halo without a costly full-resolution blur chain.
  vec2 radius = vec2(0.027 / uAspect, 0.027);
  vec2 broad = vec2(0.062 / uAspect, 0.062);
  float halo = 0.0;
  halo += sampleField(uMatter, uv + vec2(radius.x, 0.0)).y;
  halo += sampleField(uMatter, uv - vec2(radius.x, 0.0)).y;
  halo += sampleField(uMatter, uv + vec2(0.0, radius.y)).y;
  halo += sampleField(uMatter, uv - vec2(0.0, radius.y)).y;
  halo += sampleField(uMatter, uv + broad).y;
  halo += sampleField(uMatter, uv - broad).y;
  halo += sampleField(uMatter, uv + vec2(broad.x, -broad.y)).y;
  halo += sampleField(uMatter, uv + vec2(-broad.x, broad.y)).y;
  halo = min(1.0, halo * 0.12) * uGlow;
  float ambient = exp(-pow((uv.x - 0.56) * uAspect * 1.1, 2.0) - pow((uv.y - 0.1) * 1.8, 2.0));
  // Rising bands of low-contrast light suggest heat above the emitter.
  float shimmer = sin(uv.y * 39.0 - uTime * 3.4 + sin(uv.x * 17.0 + uTime) * 1.6);
  float heatHaze = exp(-pow((uv.x - 0.52) * uAspect * 2.5, 2.0)) *
                   smoothstep(0.05, 0.4, uv.y) * (1.0 - smoothstep(0.75, 1.0, uv.y));
  vec3 background = vec3(0.026, 0.019, 0.027) + ambient * vec3(0.026, 0.003, 0.002);
  background += heatHaze * (0.5 + 0.5 * shimmer) * vec3(0.010, 0.003, 0.001);
  vec3 colour = background + halo * vec3(0.23, 0.041, 0.015) + flame(m);
  outColor = vec4(1.0 - exp(-colour), 1.0);
}`,
};

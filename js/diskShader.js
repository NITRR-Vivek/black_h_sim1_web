export const diskVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const diskFragmentShader = `
uniform float time;
uniform vec3 colorInner;
uniform vec3 colorOuter;

varying vec2 vUv;
varying vec3 vWorldPosition;

// Simplex Noise (simplified)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    // Polar coordinates
    vec2 center = vec2(0.5);
    vec2 pos = vUv - center;
    float r = length(pos) * 2.0; // 0 to 1
    float angle = atan(pos.y, pos.x);

    // Animation: inner spins faster
    float speed = 2.0 / (r + 0.1);
    float animAngle = angle + time * speed * 0.5;
    
    // Noise for structure
    float n = snoise(vec2(r * 10.0, animAngle * 3.0));
    float n2 = snoise(vec2(r * 20.0, animAngle * 5.0 + time));
    
    // Gradient
    vec3 col = mix(colorInner, colorOuter, r);
    
    // Highlights
    float bright = smoothstep(0.0, 0.8, n + n2 * 0.5);
    col += vec3(1.0, 0.8, 0.5) * bright;
    
    // Soft edges
    float alpha = smoothstep(0.0, 0.2, r) * (1.0 - smoothstep(0.8, 1.0, r));
    
    gl_FragColor = vec4(col, alpha * 0.8);
}
`;

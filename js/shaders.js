export const blackHoleVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const blackHoleFragmentShader = `
uniform float time;
uniform vec2 resolution;
uniform vec3 cameraPos; // Actual camera world position
uniform vec3 cameraDir; // Not strictly needed if we use view/world matrices correctly, but easier for ray generation
uniform vec3 cameraUp;
uniform float fov;
uniform float mass;
uniform float hueShift; // For redshift effect

varying vec2 vUv;
varying vec3 vWorldPosition;

#define MAX_STEPS 50
#define STEP_SIZE 0.05
#define G 1.0
#define C 1.0 // Normalized units

// Hash/Noise for Stars
float hash(float n) { return fract(sin(n) * 1e4); }
float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

float noise(vec3 x) {
    const vec3 step = vec3(110, 241, 171);
    vec3 i = floor(x);
    vec3 f = fract(x);
    float n = dot(i, step);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix( hash(n + dot(step, vec3(0, 0, 0))), hash(n + dot(step, vec3(1, 0, 0))), u.x),
                   mix( hash(n + dot(step, vec3(0, 1, 0))), hash(n + dot(step, vec3(1, 1, 0))), u.x), u.y),
               mix(mix( hash(n + dot(step, vec3(0, 0, 1))), hash(n + dot(step, vec3(1, 0, 1))), u.x),
                   mix( hash(n + dot(step, vec3(0, 1, 1))), hash(n + dot(step, vec3(1, 1, 1))), u.x), u.y), u.z);
}

// Simple starfield
vec3 getBackground(vec3 dir) {
    // Frequency for stars
    float n = noise(dir * 150.0);
    vec3 color = vec3(0.0);
    if (n > 0.98) {
        color = vec3(pow((n - 0.98) / 0.02, 5.0)); // Stars
    }
    
    // Add some nebula noise
    float nebula = noise(dir * 3.0);
    color += vec3(0.05, 0.0, 0.1) * nebula;
    
    return color;
}

// Accretion Disk (Procedural)
vec3 getAccretionDisk(vec3 pos) {
    float dist = length(pos);
    if (dist < 2.0 * mass || dist > 6.0 * mass) return vec3(0.0);
    
    // Disk is in XZ plane (y approx 0)
    // We need to check if our ray passed close to Y=0
    // But since we are raymarching, we can just check the density at current pos
    
    float thickness = 0.1 * mass;
    if (abs(pos.y) > thickness) return vec3(0.0);
    
    float radialFade = smoothstep(2.0*mass, 3.0*mass, dist) * (1.0 - smoothstep(4.0*mass, 6.0*mass, dist));
    
    // Rotate noise
    float angle = atan(pos.z, pos.x);
    float spiral = noise(vec3(pos.x * 0.5, pos.z * 0.5, time * 0.5));
    
    vec3 diskColor = vec3(1.0, 0.6, 0.2) * radialFade * (0.5 + 0.5 * spiral);
    // Doppler beaming approximation (make one side brighter)
    // Assuming rotation around Y, moving 'left' is brighter?
    float doppler = 1.0 + 0.5 * sin(angle);
    
    return diskColor * doppler * 2.0;
}

void main() {
    // 1. Calculate Ray Direction
    // Since we are rendering on a BackSide sphere surrounding the scene/camera,
    // the direction from the camera to the fragment is simply:
    vec3 rayDir = normalize(vWorldPosition - cameraPos);
    vec3 rayPos = cameraPos;
    
    vec3 color = vec3(0.0);
    float glow = 0.0;
    
    // Raymarching
    // Schwarzschild Radius Rs = 2 * G * mass / c^2.
    float Rs = 2.0 * mass; 
    
    bool hit = false;
    
    for(int i = 0; i < MAX_STEPS; i++) {
        float r = length(rayPos);
        
        // Event Horizon Check
        if(r < Rs) {
            hit = true;
            break;
        }
        
        // Accumulate Accretion Disk (Volumetric-ish)
        // Check if close to Y plane
        // Simple integration
        if (abs(rayPos.y) < 0.5 && r > Rs * 1.5 && r < Rs * 5.0) {
             color += getAccretionDisk(rayPos) * 0.1;
        }
        
        // Gravity Bending
        // F = GM / r^2. 
        // We just deflect the direction vector towards origin.
        // Deflection angle dTheta = 4M/r (approx)
        // We will just update velocity (dir)
        
        vec3 toCenter = normalize(-rayPos);
        // Step size should depend on distance. Slower near BH.
        float step = max(0.1, r * 0.1); 
        
        // "Newtonian" stepping for speed, plus corrective bending?
        // Actually, Geodesic raymarching is:
        // acceleration = -1.5 * Rs * h^2 / r^5 ... it's complex.
        // Let's use a visual trick:
        // Bend ray towards center based on 1/r^2
        
        vec3 force = toCenter * (Rs / (r * r)); // Fake force
        
        rayDir += force * step * 2.0; // Artificial bending factor
        rayDir = normalize(rayDir);
        
        rayPos += rayDir * step;
        
        if (r > 1000.0) break; // Escaped
    }
    
    if (hit) {
        color = vec3(0.0); // Black hole center
    } else {
        color += getBackground(rayDir);
    }
    
    // Tone mapping
    color = color / (color + vec3(1.0));
    
    // Redshift application (based on hueShift uniform)
    // Simple approach: Multiply by reddish tint and darken
    if (hueShift > 0.0) {
        float factor = clamp(hueShift, 0.0, 1.0);
        color = mix(color, color * vec3(1.0, 0.2, 0.1), factor);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

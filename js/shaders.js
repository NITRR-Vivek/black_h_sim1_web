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
uniform vec3 cameraDir; 
uniform vec3 cameraUp;
uniform float fov;
uniform float mass;
uniform float hueShift; // For redshift effect

varying vec2 vUv;
varying vec3 vWorldPosition;

#define MAX_STEPS 60
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

// Milky Way / Galaxy Background
vec3 getBackground(vec3 dir) {
    // 1. Basic Starfield
    float n = noise(dir * 200.0);
    vec3 stars = vec3(0.0);
    if (n > 0.99) {
        float brightness = pow((n - 0.99) / 0.01, 20.0);
        stars = vec3(brightness);
    }

    // 2. Galactic Plane (Milky Way Band)
    // We assume the galaxy is roughly aligned with the X-Z plane or slightly tilted
    // Let's tilt it for visual interest (dir.y + dir.x * 0.5)
    float latitude = dir.y * 2.0 + sin(dir.x); 
    float distFromPlane = abs(latitude);
    
    // Core glow (dense stars)
    float galaxyCore = exp(-distFromPlane * 2.0);
    
    // Nebula Clouds (Noise)
    float cloudNoise = noise(dir * 4.0 + vec3(0.0, time * 0.05, 0.0));
    float detailNoise = noise(dir * 10.0);
    
    // Mix Colors: Core is yellow/white, Edges are purple/blue
    vec3 coreColor = vec3(1.0, 0.9, 0.7);
    vec3 outerColor = vec3(0.3, 0.1, 0.5);
    
    vec3 galaxy = mix(outerColor, coreColor, galaxyCore);
    galaxy *= (galaxyCore * 1.5 + cloudNoise * 0.5);
    galaxy *= smoothstep(1.5, 0.0, distFromPlane); // Fade out away from plane
    
    // Dust lanes (dark patches)
    float dust = noise(dir * 8.0 + 100.0);
    if (distFromPlane < 0.5) {
        galaxy *= smoothstep(0.3, 0.6, dust);
    }

    return stars + galaxy * 0.5;
}

// Accretion Disk (Procedural)
vec3 getAccretionDisk(vec3 pos) {
    float dist = length(pos);
    if (dist < 2.0 * mass || dist > 6.0 * mass) return vec3(0.0);
    
    // Disk is in XZ plane (y approx 0)
    // Simple integration approximation
    
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
        if (abs(rayPos.y) < 0.5 && r > Rs * 1.5 && r < Rs * 5.0) {
             color += getAccretionDisk(rayPos) * 0.1;
        }
        
        // Gravity Bending (Fake Force)
        vec3 toCenter = normalize(-rayPos);
        float step = max(0.1, r * 0.1); 
        vec3 force = toCenter * (Rs / (r * r)); 
        
        rayDir += force * step * 2.0; // Artificial bending factor
        rayDir = normalize(rayDir);
        
        rayPos += rayDir * step;
        
        // Accumulate Glow for Photon Ring
        // If we are very close to Rs (e.g., 1.0 < r/Rs < 1.5) and stepping through, accumulate light
        if (r > Rs && r < Rs * 1.5) {
             glow += 0.1 / (abs(r - Rs) + 0.1); 
        }
        
        if (r > 1000.0) break; // Escaped
    }
    
    if (hit) {
        color = vec3(0.0); // Black hole center
    } else {
        color += getBackground(rayDir);
        // Add Photon Ring Glow
        color += vec3(0.6, 0.8, 1.0) * glow * 0.05;
    }
    
    // Tone mapping
    color = color / (color + vec3(1.0));
    
    // Redshift application
    if (hueShift > 0.0) {
        float factor = clamp(hueShift, 0.0, 1.0);
        color = mix(color, color * vec3(1.0, 0.2, 0.1), factor);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

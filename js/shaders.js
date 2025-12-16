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

// Accretion Disk Sample (2D on Plane)
vec3 sampleDisk(vec3 pos) {
    float dist = length(pos);
    float Rs = 2.0 * mass;
    if (dist < 1.5 * Rs || dist > 15.0 * Rs) return vec3(0.0); // Much larger
    
    float radialFade = smoothstep(1.5*Rs, 3.0*Rs, dist) * (1.0 - smoothstep(10.0*Rs, 15.0*Rs, dist)); 
    
    // Rotate noise
    float angle = atan(pos.z, pos.x);
    float spiral = noise(vec3(pos.x * 0.3, pos.z * 0.3, time * 0.8));
    
    vec3 diskColor = vec3(1.0, 0.7, 0.3) * radialFade * (0.6 + 0.4 * spiral);
    
    // Doppler beaming: moving left (sin > 0) is brighter
    float doppler = 1.0 + 0.6 * sin(angle);
    
    return diskColor * doppler * 2.5; // High intensity
}

void main() {
    // 1. Calculate Ray Direction
    vec3 rayDir = normalize(vWorldPosition - cameraPos);
    vec3 rayPos = cameraPos;
    
    vec3 color = vec3(0.0);
    float glow = 0.0;
    vec3 diskAccum = vec3(0.0);
    
    // Raymarching
    float Rs = 2.0 * mass; 
    bool hit = false;
    
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 prevPos = rayPos;
        float r = length(rayPos);
        
        // Event Horizon Check
        if(r < Rs) {
            hit = true;
            break;
        }
        
        // Gravity Bending (Visual approximation)
        vec3 toCenter = normalize(-rayPos);
        float step = max(0.1, r * 0.15); // Slightly bigger steps for speed
        vec3 force = toCenter * (Rs / (r * r)); 
        
        rayDir += force * step * 2.5; // Stronger bending for visual effect
        rayDir = normalize(rayDir);
        
        rayPos += rayDir * step;
        
        // --- Accretion Disk Intersection (Plane Y=0) ---
        // If we crossed the Y plane in this step
        if (rayPos.y * prevPos.y < 0.0) {
            // Linear interpolation to find intersection point
            float t = prevPos.y / (prevPos.y - rayPos.y);
            vec3 hitPos = mix(prevPos, rayPos, t);
            
            // Sample disk at this exact 3D point
            vec3 diskSample = sampleDisk(hitPos);
            
            // Accumulate (simple transparency)
            diskAccum += diskSample;
        }
        
        // Photon Ring Glow
        if (r > Rs && r < Rs * 1.5) {
             glow += 0.2 / (abs(r - Rs) + 0.1); 
        }
        
        if (r > 1000.0) break; // Escaped
    }
    
    if (hit) {
        color = vec3(0.0); // Black hole center
    } else {
        // Background + Disk
        // If disk accumulated color, blend it on top of stars
        vec3 bg = getBackground(rayDir);
        color = bg + diskAccum;
        
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

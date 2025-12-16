import * as THREE from 'three';
import { BlackHole } from './BlackHole.js';
import { Player } from './Player.js';
import { PhysicsEngine } from './Physics.js';
import { CelestialBody } from './CelestialBody.js';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Entities
const blackHole = new BlackHole(scene, camera);
const player = new Player(scene, camera, renderer.domElement);
const physics = new PhysicsEngine();

// Celestial Bodies
const planet1 = new CelestialBody(scene, 'gas', 200, 0.2, 10, 0xffaa44);
const planet2 = new CelestialBody(scene, 'rocky', 120, 0.5, 3, 0x4488ff);

// UI Elements
const ui = {
    dist: document.getElementById('dist-val'),
    time: document.getElementById('time-val'),
    grav: document.getElementById('grav-val'),
    status: document.getElementById('status-val'),
    massSlider: document.getElementById('mass-slider'),
    massVal: document.getElementById('mass-val'),
    viewBtn: document.getElementById('view-toggle'),
    overlay: document.getElementById('alert-overlay'),
    infoBtn: document.getElementById('info-btn')
};

// UI Logic
if(ui.infoBtn) {
    ui.infoBtn.addEventListener('click', () => {
        document.getElementById('info-modal').style.display = 'flex';
    });
}
document.getElementById('close-modal')?.addEventListener('click', () => {
    document.getElementById('info-modal').style.display = 'none';
});

// Teleports
window.addEventListener('keydown', (e) => {
    if (e.key === '1') { // Safe Orbit
        player.position.set(0, 20, 150);
        player.velocity.set(0,0,0);
        player.rotation.set(0,0,0);
    }
    if (e.key === '2') { // Accretion Disk
        player.position.set(30, 5, 30);
        player.velocity.set(0,0,0);
    }
    if (e.key === '3') { // Jets
        player.position.set(5, 50, 5);
        player.rotation.x = -Math.PI/2;
    }
});

// UI Logic
ui.viewBtn.addEventListener('click', () => {
    player.toggleView();
    ui.viewBtn.innerText = player.isFirstPerson ? "Switch View (3rd Person)" : "Switch View (1st Person)";
});

ui.massSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    ui.massVal.innerText = val;
    blackHole.mass = val;
    // blackHole update handled in its loop
});

// Loop
let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    player.update(dt);
    blackHole.update(dt);
    planet1.update(dt, new THREE.Vector3(0,0,0));
    planet2.update(dt, new THREE.Vector3(0,0,0));
    
    // Physics Updates
    const r = player.position.length();
    const Rs = physics.calculateSchwarzschildRadius(blackHole.mass); 
    
    const timeDilation = physics.calculateTimeDilation(r, Rs);
    const gravity = physics.getGravity(blackHole.mass, r);
    const tidal = physics.calculateTidalForce(blackHole.mass, r);
    
    // Update UI
    ui.dist.innerText = r.toFixed(1);
    
    if (timeDilation === Infinity || timeDilation > 9999) {
         ui.time.innerText = "∞";
    } else {
         ui.time.innerText = timeDilation.toFixed(2);
    }
    
    ui.grav.innerText = gravity.toFixed(2);
    
    // Camera Shake (Simple Implementation)
    // Shake based on tidal force or proximity
    if (tidal > 0.005) {
        const shakeIntensity = Math.min(tidal * 2.0, 0.5);
        camera.position.add(new THREE.Vector3(
            (Math.random()-0.5)*shakeIntensity, 
            (Math.random()-0.5)*shakeIntensity, 
            (Math.random()-0.5)*shakeIntensity
        ));
    }

    // Status Logic & Visuals
    const statusEl = ui.status;
    const overlay = document.getElementById('alert-overlay'); // Get dynamically in case it wasn't ready
    
    if (r < Rs) {
        // INSIDE THE BLACK HOLE
        statusEl.innerText = "INSIDE EVENT HORIZON";
        statusEl.style.color = "#ff0000";
        if(overlay) overlay.innerText = "SINGULARITY REACHED - PHYSICS BREAKDOWN";
        if(overlay) overlay.style.opacity = 1;
        
        // Singularity Visuals: Invert/Chaos
        scene.background = new THREE.Color(0xffffff); // Flash white or invert
        blackHole.meshGroup.visible = false; // Hide normal BH
        // Maybe show wireframe or nothing
    } else {
        scene.background = null; // Use starfield/shader
        blackHole.meshGroup.visible = true;
        
        if (tidal > 0.05) {
            statusEl.innerText = "CRITICAL: SPAGHETTIFICATION";
            statusEl.style.color = "#ff4400";
            if(overlay) overlay.innerText = "WARNING: EXTREME TIDAL FORCES";
            if(overlay) overlay.style.opacity = (Math.sin(time * 10) + 1) * 0.5; // Blink
        } else if (gravity > 2.0) {
            statusEl.innerText = "High Gravity";
            statusEl.style.color = "#ffff00";
            if(overlay) overlay.style.opacity = 0;
        } else {
            statusEl.innerText = "Safe";
            statusEl.style.color = "#00ff00";
            if(overlay) overlay.style.opacity = 0;
        }
    }

    // Visual Integration: Pass physics data to shaders
    // Redshift effect: Shift hue or tint screen red as gravity increases
    let shift = 0.0;
    if (r > Rs) {
        shift = (Rs / r) * 2.0; 
    }
    blackHole.uniforms.hueShift.value = shift;
    
    // Stretch Player Model (Spaghettification)
    if (tidal > 0.01) {
        const stretch = 1.0 + (tidal * 10.0);
        player.meshGroup.scale.set(1/Math.sqrt(stretch), stretch, 1/Math.sqrt(stretch));
    } else {
        player.meshGroup.scale.set(1, 1, 1);
    }
    
    // FOV Warping (Relativistic speed/gravity effect)
    // As we get closer/faster, widen FOV
    const baseFov = 75;
    const targetFov = baseFov + Math.min(shift * 30.0, 45.0);
    camera.fov += (targetFov - camera.fov) * 0.1;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
}
animate(0);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

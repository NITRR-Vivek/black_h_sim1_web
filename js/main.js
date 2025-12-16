import * as THREE from 'three';
import { BlackHole } from './BlackHole.js';
import { Player } from './Player.js';
import { PhysicsEngine } from './Physics.js';

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

// UI Elements
const ui = {
    dist: document.getElementById('dist-val'),
    time: document.getElementById('time-val'),
    grav: document.getElementById('grav-val'),
    status: document.getElementById('status-val'),
    massSlider: document.getElementById('mass-slider'),
    massVal: document.getElementById('mass-val'),
    viewBtn: document.getElementById('view-toggle')
};

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
    
    // Physics Updates
    const r = player.position.length();
    const Rs = physics.calculateSchwarzschildRadius(blackHole.mass); 
    
    // We now have consistent physics: Rs = 2 * Mass everywhere.
    
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
    
    // Status Logic
    const statusEl = ui.status;
    if (r < Rs) {
        statusEl.innerText = "INSIDE EVENT HORIZON";
        statusEl.style.color = "#ff0000";
    } else if (tidal > 0.05) { // Threshold tweaking needed
        statusEl.innerText = "CRITICAL: SPAGHETTIFICATION";
        statusEl.style.color = "#ff4400";
    } else if (gravity > 2.0) {
        statusEl.innerText = "High Gravity";
        statusEl.style.color = "#ffff00";
    } else {
        statusEl.innerText = "Safe";
        statusEl.style.color = "#00ff00";
    }

    // Visual Integration: Pass physics data to shaders
    // Redshift effect: Shift hue or tint screen red as gravity increases
    // We can use the 'hueShift' uniform in the BH shader, or a post-process
    // For now, let's use the hueShift uniform I added earlier to BlackHole
    
    // Calculate a "Redshift Factor" based on gravity/time dilation
    // High gravity -> Redshift
    let shift = 0.0;
    if (r > Rs) {
        shift = (Rs / r) * 2.0; // Increases as we get closer
    }
    blackHole.uniforms.hueShift.value = shift;
    
    // Stretch Player Model (Spaghettification)
    // Only if in 3rd person to see it, or just for fun
    if (tidal > 0.01) {
        const stretch = 1.0 + (tidal * 10.0);
        player.meshGroup.scale.set(1/Math.sqrt(stretch), stretch, 1/Math.sqrt(stretch));
    } else {
        player.meshGroup.scale.set(1, 1, 1);
    }

    renderer.render(scene, camera);
}
animate(0);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

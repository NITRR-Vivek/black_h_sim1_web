import * as THREE from 'three';
import { blackHoleVertexShader, blackHoleFragmentShader } from './shaders.js';
import { diskVertexShader, diskFragmentShader } from './diskShader.js';

export class BlackHole {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mass = 10; // Solar masses
        this.rs = 0; 
        
        this.meshGroup = new THREE.Group();
        this.scene.add(this.meshGroup);

        this.updateProperties();
        this.initVisuals();
    }

    updateProperties() {
        // Visual scale: Mass 10 -> Rs = 20 units (if mass=10)
        // Physics G=1, c=1 => Rs = 2M.
        this.rs = this.mass * 2.0;
    }

    initVisuals() {
        // 1. The Lensing Background (BackSide Sphere)
        const geo = new THREE.SphereGeometry(1000, 60, 40);
        this.uniforms = {
            time: { value: 0 },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            cameraPos: { value: new THREE.Vector3() },
            cameraDir: { value: new THREE.Vector3() },
            cameraUp: { value: new THREE.Vector3() },
            fov: { value: 45 },
            mass: { value: this.mass },
            hueShift: { value: 0.0 }
        };
        
        const mat = new THREE.ShaderMaterial({
            vertexShader: blackHoleVertexShader,
            fragmentShader: blackHoleFragmentShader,
            uniforms: this.uniforms,
            side: THREE.BackSide,
            depthWrite: false, 
        });
        
        this.backgroundSphere = new THREE.Mesh(geo, mat);
        this.backgroundSphere.renderOrder = -1;
        this.meshGroup.add(this.backgroundSphere);
        
        // 2. The Occlusion Sphere
        // Using Unit Sphere so we can scale it easily
        const occGeo = new THREE.SphereGeometry(1, 32, 32);
        const occMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.occluder = new THREE.Mesh(occGeo, occMat);
        this.occluder.scale.setScalar(this.rs);
        this.meshGroup.add(this.occluder);

        // 3. Volumetric Accretion Disk
        const diskGeo = new THREE.PlaneGeometry(1, 1, 64, 64);
        this.diskUniforms = {
            time: { value: 0 },
            colorInner: { value: new THREE.Color(0xffaa00) },
            colorOuter: { value: new THREE.Color(0xcc3300) }
        };
        const diskMat = new THREE.ShaderMaterial({
            vertexShader: diskVertexShader,
            fragmentShader: diskFragmentShader,
            uniforms: this.diskUniforms,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false, // Glow effect
            blending: THREE.AdditiveBlending
        });
        this.accretionDisk = new THREE.Mesh(diskGeo, diskMat);
        this.accretionDisk.rotation.x = -Math.PI / 2;
        this.meshGroup.add(this.accretionDisk);

        // 4. Relativistic Jets
        const jetParticles = 1000;
        const jetGeo = new THREE.BufferGeometry();
        const jetPos = [];
        const jetVel = [];
        for (let i = 0; i < jetParticles; i++) {
            jetPos.push((Math.random()-0.5)*2, (Math.random())*5, (Math.random()-0.5)*2);
            jetVel.push(0, Math.random() + 1.0, 0); // Up
        }
        jetGeo.setAttribute('position', new THREE.Float32BufferAttribute(jetPos, 3));
        const jetMat = new THREE.PointsMaterial({
            color: 0xaaaaff,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.jets = new THREE.Points(jetGeo, jetMat);
        this.meshGroup.add(this.jets);
        
        // Mirror jet (down)
        this.jetsDown = this.jets.clone();
        this.jetsDown.rotation.x = Math.PI;
        this.meshGroup.add(this.jetsDown);
    }
    
    update(dt) {
        this.uniforms.time.value += dt;
        this.diskUniforms.time.value += dt;
        this.uniforms.mass.value = this.mass;
        
        this.uniforms.cameraPos.value.copy(this.camera.position);
        
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        this.uniforms.cameraDir.value.copy(dir);
        
        // Accurate Camera Up
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(this.camera.quaternion);
        this.uniforms.cameraUp.value.copy(up);

        this.uniforms.fov.value = (this.camera.fov * Math.PI) / 180;
        
        // Update Occluder
        this.updateProperties();
        this.occluder.scale.setScalar(this.rs);

        // Update Disk Size
        // Disk should span from ~1.5 Rs to 4-5 Rs
        const diskScale = this.rs * 6.0;
        this.accretionDisk.scale.set(diskScale, diskScale, 1);
        
        // Update Jets (Fake particle animation)
        const positions = this.jets.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i+=3) {
            positions[i] += dt * 20.0;
            if (positions[i] > 50 + Math.random()*20) {
                positions[i] = this.rs; // Reset to near BH
                positions[i-1] = (Math.random()-0.5) * this.rs * 0.2; // reset X
                positions[i+1] = (Math.random()-0.5) * this.rs * 0.2; // reset Z
            }
        }
        this.jets.geometry.attributes.position.needsUpdate = true;
        
        // Sync down jets (hacky reuse of logic or just rotate visual)
        // Since we cloned, they have same geometry reference? No, clone shares geo unless specified.
        // If shares geo, they update together. Perfect.
    }
}

import * as THREE from 'three';
import { blackHoleVertexShader, blackHoleFragmentShader } from './shaders.js';

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
    }
    
    update(dt) {
        this.uniforms.time.value += dt;
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
    }
}

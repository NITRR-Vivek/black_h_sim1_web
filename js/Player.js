import * as THREE from 'three';

export class Player {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        
        // State
        this.position = new THREE.Vector3(0, 0, 50);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.isFirstPerson = false;
        
        // Physics
        this.velocity = new THREE.Vector3();
        this.moveSpeed = 20.0;
        
        // Input
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false
        };
        
        this.initModel();
        this.initInput();
    }

    initModel() {
        this.meshGroup = new THREE.Group();
        this.scene.add(this.meshGroup);
        
        // Sci-Fi Spaceship
        const hullMat = new THREE.MeshStandardMaterial({ 
            color: 0x88ccff, 
            roughness: 0.3, 
            metalness: 0.8 
        });
        const darkMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.7 
        });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        // Fuselage (Cone + Cylinder)
        const noseGeo = new THREE.ConeGeometry(0.5, 2.0, 8);
        const nose = new THREE.Mesh(noseGeo, hullMat);
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = -1.0;
        this.meshGroup.add(nose);

        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 2.0, 8);
        const body = new THREE.Mesh(bodyGeo, hullMat);
        body.rotation.x = -Math.PI / 2;
        body.position.z = 1.0;
        this.meshGroup.add(body);
        
        // Cockpit
        const cockpitGeo = new THREE.BoxGeometry(0.6, 0.4, 1.0);
        const cockpit = new THREE.Mesh(cockpitGeo, new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.1, metalness: 0.9
        }));
        cockpit.position.set(0, 0.4, 0.5);
        this.meshGroup.add(cockpit);

        // Wings
        const wingGeo = new THREE.BufferGeometry();
        const wingVertices = new Float32Array([
            0, 0, 0,   2.5, 0, 1.5,   0, 0, 2.0, // Left Wing
            0, 0, 0,   -2.5, 0, 1.5,  0, 0, 2.0  // Right Wing
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
        const wings = new THREE.Mesh(wingGeo, hullMat);
        wings.position.set(0, 0, 0.5);
        this.meshGroup.add(wings);

        // Double Engines
        const engineGeo = new THREE.CylinderGeometry(0.3, 0.2, 0.5, 12);
        
        const engineL = new THREE.Mesh(engineGeo, darkMat);
        engineL.rotation.x = -Math.PI / 2;
        engineL.position.set(-0.6, 0, 2.25);
        this.meshGroup.add(engineL);

        const engineR = new THREE.Mesh(engineGeo, darkMat);
        engineR.rotation.x = -Math.PI / 2;
        engineR.position.set(0.6, 0, 2.25);
        this.meshGroup.add(engineR);

        // Solar Wings (Panels)
        const panelGeo = new THREE.BoxGeometry(2.0, 0.05, 0.8);
        const panelMat = new THREE.MeshStandardMaterial({ 
            color: 0x111144, 
            roughness: 0.2, 
            metalness: 0.6,
            emissive: 0x000022
        });
        
        const panelL = new THREE.Mesh(panelGeo, panelMat);
        panelL.position.set(-3.5, 0, 0.5); // Extend from left wing
        this.meshGroup.add(panelL);

        const panelR = new THREE.Mesh(panelGeo, panelMat);
        panelR.position.set(3.5, 0, 0.5); // Extend from right wing
        this.meshGroup.add(panelR);


        // Double Thruster Glows
        const jetGeo = new THREE.ConeGeometry(0.2, 2.5, 8, 1, true);
        const jetMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.thrusterL = new THREE.Mesh(jetGeo, jetMat);
        this.thrusterL.rotation.x = Math.PI / 2; 
        this.thrusterL.position.set(-0.6, 0, 3.5);
        this.meshGroup.add(this.thrusterL);

        this.thrusterR = new THREE.Mesh(jetGeo, jetMat);
        this.thrusterR.rotation.x = Math.PI / 2; 
        this.thrusterR.position.set(0.6, 0, 3.5);
        this.meshGroup.add(this.thrusterR);
        
        // Initialize scales
        this.thrusterL.scale.set(0,0,0);
        this.thrusterR.scale.set(0,0,0);
        
        this.meshGroup.position.copy(this.position);
    }

    initInput() {
        document.addEventListener('keydown', (e) => this.onKey(e, true));
        document.addEventListener('keyup', (e) => this.onKey(e, false));
        
        this.domElement.addEventListener('click', () => {
             this.domElement.requestPointerLock();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.domElement) {
                this.rotation.y -= e.movementX * 0.002;
                this.rotation.x -= e.movementY * 0.002;
                this.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotation.x));
            }
        });
    }

    onKey(e, pressed) {
        switch(e.code) {
            case 'KeyW': this.keys.forward = pressed; break;
            case 'KeyS': this.keys.backward = pressed; break;
            case 'KeyA': this.keys.left = pressed; break;
            case 'KeyD': this.keys.right = pressed; break;
            case 'Space': this.keys.up = pressed; break;
            case 'ShiftLeft': this.keys.down = pressed; break;
        }
    }

    toggleView() {
        this.isFirstPerson = !this.isFirstPerson;
    }

    update(dt) {
        // Simple movement
        const speed = this.moveSpeed * dt;
        const dir = new THREE.Vector3();
        
        if (this.keys.forward) dir.z -= 1;
        if (this.keys.backward) dir.z += 1;
        if (this.keys.left) dir.x -= 1;
        if (this.keys.right) dir.x += 1;
        
        dir.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        if (this.keys.up) dir.y += 1;
        if (this.keys.down) dir.y -= 1;
        
        this.position.add(dir.multiplyScalar(speed));
        this.meshGroup.position.copy(this.position);
        
        // Rotate body to face camera yaw
        this.meshGroup.rotation.y = this.rotation.y;
        
        // Thruster Logic (Double)
        if (this.keys.forward) {
            // Flicker effect
            const flicker = 0.8 + Math.random() * 0.4;
            const vFlicker = new THREE.Vector3(flicker, flicker, flicker);
            this.thrusterL.scale.copy(vFlicker);
            this.thrusterR.scale.copy(vFlicker);
        } else {
            const vZero = new THREE.Vector3(0,0,0);
            this.thrusterL.scale.lerp(vZero, 0.2);
            this.thrusterR.scale.lerp(vZero, 0.2);
        }

        // Camera Logic
        if (this.isFirstPerson) {
            // Camera inside Cockpit
            this.camera.position.copy(this.position).add(new THREE.Vector3(0, 0.6, 0)); 
            this.camera.rotation.copy(this.rotation);
            this.meshGroup.visible = false; // Hide ship in 1st person
        } else {
            // 3rd Person Orbit
            const camOffset = new THREE.Vector3(0, 3, 10); 
            camOffset.applyEuler(new THREE.Euler(this.rotation.x * 0.5, this.rotation.y, 0)); 
            
            this.camera.position.copy(this.position).add(camOffset);
            this.camera.lookAt(this.position.clone()); // Look at ship center
            this.meshGroup.visible = true;
        }
    }
}

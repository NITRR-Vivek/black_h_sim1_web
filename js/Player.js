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
        
        // Simple Astronaut: White suit
        const material = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
        
        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 12);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.75;
        this.meshGroup.add(body);
        
        // Legs
        const legGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 12);
        const legL = new THREE.Mesh(legGeo, material);
        legL.position.set(-0.3, 0, 0);
        this.meshGroup.add(legL);
        const legR = new THREE.Mesh(legGeo, material);
        legR.position.set(0.3, 0, 0);
        this.meshGroup.add(legR);
        
        // Arms
        const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.0, 12);
        const armL = new THREE.Mesh(armGeo, material);
        armL.position.set(-0.7, 1.0, 0);
        armL.rotation.z = 0.5;
        this.meshGroup.add(armL);
        const armR = new THREE.Mesh(armGeo, material);
        armR.position.set(0.7, 1.0, 0);
        armR.rotation.z = -0.5;
        this.meshGroup.add(armR);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 1.7;
        this.meshGroup.add(head);
        
        // Visor
        const visorGeo = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI/2.5);
        const visorMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.rotation.x = -Math.PI / 2;
        visor.position.set(0, 1.7, 0.25);
        this.meshGroup.add(visor);
        
        // Backpack
        const packGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
        const pack = new THREE.Mesh(packGeo, material);
        pack.position.set(0, 1.0, -0.4);
        this.meshGroup.add(pack);
        
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

        // Camera Logic
        if (this.isFirstPerson) {
            // Camera inside head
            this.camera.position.copy(this.position).add(new THREE.Vector3(0, 1.7, 0)); 
            this.camera.rotation.copy(this.rotation);
            this.meshGroup.visible = false; 
        } else {
            // 3rd Person Orbit
            const camOffset = new THREE.Vector3(0, 2, 8); 
            camOffset.applyEuler(new THREE.Euler(this.rotation.x * 0.5, this.rotation.y, 0)); 
            // We rotate offset by Y, and slightly by X to look up/down
            
            this.camera.position.copy(this.position).add(camOffset);
            this.camera.lookAt(this.position.clone().add(new THREE.Vector3(0, 1, 0)));
            this.meshGroup.visible = true;
        }
    }
}

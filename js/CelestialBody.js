import * as THREE from 'three';

export class CelestialBody {
    constructor(scene, type, distance, speed, size, textureColor) {
        this.scene = scene;
        this.distance = distance;
        this.speed = speed;
        this.angle = Math.random() * Math.PI * 2;
        
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        
        let material;
        if (type === 'star') {
            material = new THREE.MeshBasicMaterial({ color: textureColor });
        } else {
            // Simple noise detail
            material = new THREE.MeshStandardMaterial({ 
                color: textureColor, 
                roughness: 0.8 
            });
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
        
        // Label or Rings?
        if (type === 'gas') {
             const ringGeo = new THREE.RingGeometry(size * 1.4, size * 2.0, 32);
             const ringMat = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
             const ring = new THREE.Mesh(ringGeo, ringMat);
             ring.rotation.x = Math.PI / 2;
             this.mesh.add(ring);
        }
    }
    
    update(dt, blackHolePos) {
        this.angle += this.speed * dt;
        this.mesh.position.x = Math.cos(this.angle) * this.distance;
        this.mesh.position.z = Math.sin(this.angle) * this.distance;
        // Keep y near 0 but slight variation
        this.mesh.position.y = Math.sin(this.angle * 0.5) * (this.distance * 0.1);
        
        this.mesh.rotation.y += dt * 0.5;
    }
}

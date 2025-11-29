import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import * as CANNON from 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
import { createMaterial, addNoise } from './utils.js';

class Disc {
    constructor(radius, thickness, color, scene, world, x = 0, y = 0, z = 0) {
        this.radius = radius;
        this.thickness = thickness;
        this.color = color;
        this.scene = scene;
        this.world = world;
        this.isActive = false;
        this.hasBeenScored = false;
        
        // Create visual representation
        this.mesh = this.createMesh(x, y, z);
        
        // Create physics body
        this.body = this.createPhysicsBody(x, y, z);
    }
    
    createMesh(x, y, z) {
        const geometry = new THREE.CylinderGeometry(
            this.radius, 
            this.radius, 
            this.thickness, 
            32
        );
        
        // Create a more interesting material
        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            shininess: 50,
            specular: 0x111111,
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(x, y + this.thickness / 2, z);
        mesh.rotation.x = Math.PI / 2; // Lay the cylinder flat
        
        // Add a rim to the disc
        const rimGeometry = new THREE.TorusGeometry(
            this.radius * 0.9, 
            this.radius * 0.1, 
            16, 
            32
        );
        const rimMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            shininess: 30
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = Math.PI / 2;
        mesh.add(rim);
        
        this.scene.add(mesh);
        return mesh;
    }
    
    createPhysicsBody(x, y, z) {
        const shape = new CANNON.Cylinder(
            this.radius,
            this.radius,
            this.thickness,
            16
        );
        
        const body = new CANNON.Body({
            mass: 1,
            shape: shape,
            position: new CANNON.Vec3(x, y + this.thickness / 2, z),
            linearDamping: 0.3,  // Air resistance
            angularDamping: 0.3,  // Angular resistance
            material: new CANNON.Material('discMaterial'),
            collisionFilterGroup: 2,
            collisionFilterMask: 1 | 2
        });
        
        // Rotate the cylinder to be flat
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        
        // Add friction
        body.linearDamping = 0.2;
        body.angularDamping = 0.2;
        
        // Store reference to the mesh
        body.mesh = this.mesh;
        
        this.world.addBody(body);
        return body;
    }
    
    update() {
        if (!this.body) return;
        
        // Update mesh position and rotation from physics
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
        
        // Apply a small amount of randomness to simulate air resistance and imperfections
        if (this.body.velocity.lengthSquared() > 0.01) {
            this.body.velocity.x *= addNoise(1, 0.001);
            this.body.velocity.z *= addNoise(1, 0.001);
        }
    }
    
    applyForce(force, worldPoint) {
        if (this.body) {
            this.body.applyForce(force, worldPoint || this.body.position);
        }
    }
    
    setPosition(x, y, z) {
        if (this.body) {
            this.body.position.set(x, y + this.thickness / 2, z);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
        }
        if (this.mesh) {
            this.mesh.position.set(x, y + this.thickness / 2, z);
        }
    }
    
    reset() {
        this.setPosition(0, 0, 0);
        this.isActive = false;
        this.hasBeenScored = false;
    }
    
    isMoving() {
        if (!this.body) return false;
        return this.body.velocity.lengthSquared() > 0.01 || 
               this.body.angularVelocity.lengthSquared() > 0.01;
    }
    
    remove() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        if (this.body) {
            this.world.removeBody(this.body);
        }
    }
}

export default Disc;

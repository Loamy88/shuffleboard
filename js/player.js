import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Disc from './disc.js';
import { clamp, degToRad, createMaterial } from './utils.js';

class Player {
    constructor(scene, isAI = false) {
        this.scene = scene;
        this.isAI = isAI;
        this.score = 0;
        this.discs = [];
        this.currentDiscIndex = 0;
        this.angle = 0; // In radians
        this.position = new THREE.Vector3(0, 0.2, -8);
        this.currentPower = 0;
        this.isCharging = false;
        this.chargeSpeed = 0.8; // Adjust this to change how fast the power meter fills (higher = faster)
        this.maxPower = 1.5;    // Maximum power multiplier
        
        // Player color (red for player 1, blue for player 2)
        this.color = isAI ? 0x0000ff : 0xff0000;
        
        // Create player's discs
        this.createDiscs();
        
        // Create player's stick
        this.createStick();
    }
    
    createDiscs() {
        const discSpacing = 0.5;
        const startX = -0.75; // Start position for first disc
        
        for (let i = 0; i < 4; i++) {
            const disc = new Disc(
                this.scene,
                this.scene.userData.world, // World is added to scene.userData in game.js
                startX + i * discSpacing,
                -7.5, // Slightly in front of the player
                this.color,
                this.isAI ? 2 : 1 // Player numbers: 1 for human, 2 for AI
            );
            this.discs.push(disc);
        }
    }
    
    createStick() {
        // Create a simple stick for the player
        const stickGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
        const stickMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513, // Brown color for the stick
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.stick = new THREE.Mesh(stickGeometry, stickMaterial);
        this.stick.position.copy(this.position);
        this.stick.position.y += 0.1; // Slightly above the board
        this.stick.rotation.x = Math.PI / 2; // Lay the stick flat
        this.scene.add(this.stick);
    }
    
    update(delta) {
        // Update stick position and rotation
        if (this.stick) {
            this.stick.position.copy(this.position);
            this.stick.position.y = 0.3; // Keep it slightly above the board
            this.stick.rotation.z = this.angle - Math.PI / 2; // Point the stick in the aiming direction
            
            // Add a slight tilt when charging
            if (this.isCharging) {
                this.stick.rotation.x = Math.PI / 2 + Math.sin(Date.now() * 0.01) * 0.1;
            } else {
                this.stick.rotation.x = Math.PI / 2;
            }
        }
        
        // Update power when charging
        if (this.isCharging) {
            this.currentPower = (Math.sin(Date.now() * 0.005 * this.chargeSpeed) + 1) * 0.5;
        }
    }
    
    startCharging() {
        this.isCharging = true;
        this.currentPower = 0;
    }
    
    shoot() {
        this.isCharging = false;
        const power = this.currentPower * this.maxPower;
        this.currentPower = 0;
        return power;
    }
    
    move(direction, delta) {
        const speed = 5 * delta;
        this.position.x = clamp(this.position.x + direction * speed, -1.5, 1.5);
    }
    
    rotate(direction, delta) {
        const rotationSpeed = 2 * delta;
        this.angle = (this.angle + direction * rotationSpeed) % (Math.PI * 2);
    }
    
    getNextDisc() {
        if (this.currentDiscIndex >= this.discs.length) {
            return null;
        }
        return this.discs[this.currentDiscIndex];
    }
    
    hasDiscsLeft() {
        return this.currentDiscIndex < this.discs.length;
    }
    
    updateScore(points) {
        this.score += points;
    }
    
    reset() {
        this.currentDiscIndex = 0;
        this.discs.forEach(disc => disc.remove());
        this.discs = [];
        this.createDiscs();
    }
}

export default Player;


import * as THREE from 'three';
import { degToRad, clamp } from './utils.js';

class Player {
    constructor(scene, isAI = false) {
        this.scene = scene;
        this.isAI = isAI;
        this.score = 0;
        this.discs = [];
        this.maxDiscs = 4;
        this.discColor = isAI ? 0x0000ff : 0xff0000; // AI is blue, player is red
        this.currentPower = 0;
        this.powerIncreasing = true;
        this.angle = 0;
        this.position = new THREE.Vector3(0, 0, -2);
        
        // Create player's stick
        this.createStick();
    }

    createStick() {
        const stickGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
        const stickMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });
        this.stick = new THREE.Mesh(stickGeometry, stickMaterial);
        this.stick.position.copy(this.position);
        this.stick.position.y = 0.5;
        this.stick.rotation.x = degToRad(90);
        this.scene.add(this.stick);
    }

    update(delta) {
        // Update stick position and rotation
        this.stick.position.x = this.position.x;
        this.stick.rotation.z = this.angle;

        // Update power meter if charging
        if (this.isCharging) {
            const powerSpeed = 0.5; // Speed of power increase/decrease
            const powerDelta = powerSpeed * delta;
            
            if (this.powerIncreasing) {
                this.currentPower = Math.min(1, this.currentPower + powerDelta);
                if (this.currentPower >= 1) this.powerIncreasing = false;
            } else {
                this.currentPower = Math.max(0, this.currentPower - powerDelta);
                if (this.currentPower <= 0) this.powerIncreasing = true;
            }
        }
    }

    startCharging() {
        this.isCharging = true;
        this.currentPower = 0;
        this.powerIncreasing = true;
    }

    shoot() {
        this.isCharging = false;
        const power = this.currentPower;
        this.currentPower = 0;
        return power;
    }

    move(direction, delta) {
        const moveSpeed = 3 * delta;
        this.position.x = clamp(
            this.position.x + (direction * moveSpeed),
            -0.8, // Keep player within board bounds
            0.8
        );
    }

    rotate(direction, delta) {
        const rotationSpeed = 1.5 * delta;
        this.angle = clamp(
            this.angle + (direction * rotationSpeed),
            -Math.PI / 4, // -45 degrees
            Math.PI / 4   // 45 degrees
        );
    }

    addDisc(disc) {
        if (this.discs.length < this.maxDiscs) {
            this.discs.push(disc);
            return true;
        }
        return false;
    }

    hasDiscsLeft() {
        return this.discs.some(disc => !disc.scored);
    }

    getNextDisc() {
        return this.discs.find(disc => !disc.scored);
    }

    updateScore(points) {
        this.score += points;
        return this.score;
    }
}

export default Player;

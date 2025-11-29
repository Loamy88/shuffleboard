import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import Disc from './disc.js';

class Player {
    constructor(id, color, scene, world, isAI = false) {
        this.id = id;
        this.color = color;
        this.score = 0;
        this.discs = [];
        this.scene = scene;
        this.world = world;
        this.isAI = isAI;
        this.discsThrown = 0;
        this.maxDiscs = 4;
        this.discRadius = 0.15;
        this.discThickness = 0.1;
        
        // Create the player's discs
        this.createDiscs();
    }
    
    createDiscs() {
        for (let i = 0; i < this.maxDiscs; i++) {
            const disc = new Disc(
                this.discRadius,
                this.discThickness,
                this.color,
                this.scene,
                this.world
            );
            this.discs.push(disc);
        }
    }
    
    reset() {
        this.score = 0;
        this.discsThrown = 0;
        this.discs.forEach(disc => disc.reset());
    }
    
    hasDiscsLeft() {
        return this.discsThrown < this.maxDiscs;
    }
    
    getNextDisc() {
        if (this.discsThrown >= this.maxDiscs) return null;
        return this.discs[this.discsThrown];
    }
    
    throwDisc(power, angle) {
        if (this.discsThrown >= this.maxDiscs) return false;
        
        const disc = this.discs[this.discsThrown];
        if (!disc) return false;
        
        // Position the disc at the starting position
        const startX = 0; // Center of the board
        const startY = 0.1;
        const startZ = -14; // Near the player's end
        
        disc.setPosition(startX, startY, startZ);
        
        // Calculate force direction based on angle
        const forceX = Math.sin(angle) * power * 0.1;
        const forceZ = -Math.cos(angle) * power * 0.1;
        
        // Apply force to the disc
        disc.applyForce(new CANNON.Vec3(forceX, 0, forceZ));
        
        this.discsThrown++;
        return true;
    }
    
    update() {
        this.discs.forEach(disc => disc.update());
    }
    
    // AI will be implemented in a separate file later
    makeAIMove() {
        // Simple AI logic - will be enhanced with neural network later
        if (!this.isAI || this.discsThrown >= this.maxDiscs) return;
        
        // Random power between 0.5 and 1.0
        const power = 0.5 + Math.random() * 0.5;
        
        // Slight random angle (slightly to the left or right)
        const angle = (Math.random() - 0.5) * 0.2; // Small angle variation
        
        // Add a small delay to simulate thinking
        setTimeout(() => {
            this.throwDisc(power, angle);
        }, 1000);
    }
    
    // Calculate score for this player's discs
    calculateScore(board) {
        let roundScore = 0;
        
        this.discs.forEach(disc => {
            if (!disc.hasBeenScored) {
                const discPos = disc.body.position;
                const score = board.calculateScore(discPos.z);
                roundScore += score;
                disc.hasBeenScored = true;
            }
        });
        
        this.score += roundScore;
        return roundScore;
    }
    
    // Check if any of the player's discs are still moving
    hasMovingDiscs() {
        return this.discs.some(disc => disc.isMoving());
    }
    
    // Clean up resources
    dispose() {
        this.discs.forEach(disc => disc.remove());
        this.discs = [];
    }
}

export default Player;

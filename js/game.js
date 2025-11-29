import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Player from './player.js';
import Board from './board.js';
import Disc from './disc.js';
import { clamp, degToRad, distance3D } from './utils.js';

class ShuffleboardGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.world = new CANNON.World();
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'aiming'; // 'aiming', 'charging', 'shooting', 'scoring', 'gameOver'
        this.discs = [];
        this.winScore = 75;
        this.round = 1;
        this.isSuddenDeath = false;

        this.init();
    }

    init() {
        // Set up scene
        this.setupScene();
        
        // Set up physics
        this.setupPhysics();
        
        // Create game objects
        this.board = new Board(this.scene, this.world);
        
        // Create players
        this.players = [
            new Player(this.scene, false), // Human player
            new Player(this.scene, true)   // AI player
        ];
        
        // Set up camera
        this.setupCamera();
        
        // Set up lighting
        this.setupLights();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.animate();
        
        // Start first turn
        this.startTurn();
    }

    setupScene() {
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Set background color
        this.scene.background = new THREE.Color(0x87CEEB);
    }

    setupPhysics() {
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 1.7, -3);
        this.camera.lookAt(0, 1.7, 0);
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    startTurn() {
        const currentPlayer = this.getCurrentPlayer();
        this.updateUI();
        this.showMessage(`Player ${this.currentPlayerIndex + 1}'s Turn`);
        
        if (currentPlayer.isAI) {
            this.handleAITurn();
        }
    }

    handleAITurn() {
        // Simple AI - will be enhanced later
        setTimeout(() => {
            this.gameState = 'charging';
            const currentPlayer = this.getCurrentPlayer();
            currentPlayer.startCharging();
            
            // Random power and angle for now
            const aiChargeTime = Math.random() * 2 + 1; // 1-3 seconds
            setTimeout(() => {
                const power = currentPlayer.shoot();
                this.shootDisc(power);
            }, aiChargeTime * 1000);
        }, 1000);
    }

    shootDisc(power) {
        const currentPlayer = this.getCurrentPlayer();
        const disc = currentPlayer.getNextDisc();
        
        if (!disc) {
            this.endTurn();
            return;
        }

        const angle = currentPlayer.angle;
        const direction = new THREE.Vector3(
            Math.sin(angle) * 0.5,
            0,
            Math.cos(angle)
        ).normalize();

        // Apply force to the disc
        const force = power * 20;
        disc.body.applyImpulse(
            new CANNON.Vec3(
                direction.x * force,
                0,
                direction.z * force
            ),
            new CANNON.Vec3(0, 0, 0)
        );

        this.gameState = 'shooting';
    }

    update() {
        const delta = this.clock.getDelta();
        
        // Update physics
        this.world.step(1/60, delta, 3);
        
        // Update game objects
        this.discs.forEach(disc => disc.update());
        this.players.forEach(player => player.update(delta));
        
        // Check game state
        if (this.gameState === 'shooting') {
            this.checkDiscsStopped();
        }
    }

    checkDiscsStopped() {
        const currentPlayer = this.getCurrentPlayer();
        const currentDisc = currentPlayer.getNextDisc();
        
        if (currentDisc && !currentDisc.isMoving()) {
            this.endTurn();
        }
    }

    endTurn() {
        const currentPlayer = this.getCurrentPlayer();
        
        // Check if all discs have been shot
        if (!currentPlayer.hasDiscsLeft()) {
            if (this.players.every(player => !player.hasDiscsLeft())) {
                this.endRound();
                return;
            }
        }
        
        // Switch to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.gameState = 'aiming';
        this.startTurn();
    }

    endRound() {
        // Calculate scores
        const scores = this.calculateScores();
        
        // Update player scores
        this.players.forEach((player, index) => {
            player.updateScore(scores[index]);
        });
        
        // Update UI
        this.updateUI();
        
        // Check for winner
        const winner = this.checkWinner();
        if (winner !== null) {
            this.gameOver(winner);
            return;
        }
        
        // Start next round
        this.round++;
        this.isSuddenDeath = this.players.some(p => p.score >= this.winScore);
        this.resetRound();
    }

    calculateScores() {
        // Implement scoring logic based on disc positions
        // This is a simplified version - you'll need to implement the actual scoring rules
        return [0, 0]; // Placeholder
    }

    checkWinner() {
        // Check if any player has won
        // Return player index or null if no winner yet
        return null; // Placeholder
    }

    gameOver(winnerIndex) {
        this.gameState = 'gameOver';
        this.showMessage(`Player ${winnerIndex + 1} Wins!`, 5000);
    }

    resetRound() {
        // Reset discs for new round
        this.discs = [];
        this.players.forEach(player => {
            // Reset player discs
        });
        
        // Reset player turns
        this.currentPlayerIndex = 0;
        this.gameState = 'aiming';
        this.startTurn();
    }

    updateUI() {
        // Update score display
        this.players.forEach((player, index) => {
            document.getElementById(`player${index + 1}-score`).textContent = player.score;
        });
        
        // Update turn indicator
        document.getElementById('turn-indicator').textContent = 
            `Player ${this.currentPlayerIndex + 1}'s Turn`;
            
        // Update power meter
        const powerMeter = document.getElementById('power-meter');
        const powerBar = document.getElementById('power-bar');
        const currentPlayer = this.getCurrentPlayer();
        
        if (this.gameState === 'charging') {
            powerMeter.style.display = 'block';
            powerBar.style.width = `${currentPlayer.currentPower * 100}%`;
        } else {
            powerMeter.style.display = 'none';
        }
    }

    showMessage(message, duration = 2000) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        this.messageTimeout = setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    onKeyDown(event) {
        if (this.gameState === 'gameOver') return;
        
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer.isAI) return;
        
        switch(event.key) {
            case ' ':
            case 'Spacebar':
                if (this.gameState === 'aiming') {
                    this.gameState = 'charging';
                    currentPlayer.startCharging();
                }
                break;
            case 'ArrowLeft':
            case 'a':
                this.moveDirection = -1;
                break;
            case 'ArrowRight':
            case 'd':
                this.moveDirection = 1;
                break;
            case 'ArrowUp':
            case 'w':
                this.rotateDirection = 1;
                break;
            case 'ArrowDown':
            case 's':
                this.rotateDirection = -1;
                break;
        }
    }

    onKeyUp(event) {
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer.isAI) return;
        
        switch(event.key) {
            case ' ':
            case 'Spacebar':
                if (this.gameState === 'charging') {
                    const power = currentPlayer.shoot();
                    this.shootDisc(power);
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'ArrowRight':
            case 'd':
                this.moveDirection = 0;
                break;
            case 'ArrowUp':
            case 'w':
            case 'ArrowDown':
            case 's':
                this.rotateDirection = 0;
                break;
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Handle continuous input
        if (this.gameState === 'aiming' || this.gameState === 'charging') {
            const currentPlayer = this.getCurrentPlayer();
            
            if (this.moveDirection !== 0) {
                currentPlayer.move(this.moveDirection, delta);
            }
            
            if (this.rotateDirection !== 0) {
                currentPlayer.rotate(this.rotateDirection, delta);
            }
            
            // Update power meter
            if (this.gameState === 'charging') {
                this.updateUI();
            }
        }
        
        // Update game state
        this.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    const game = new ShuffleboardGame();
});



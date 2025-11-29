import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
import Board from './board.js';
import Player from './player.js';
import { createMaterial, degToRad, randomInRange } from './utils.js';

class ShuffleboardGame {
    constructor() {
        // Game state
        this.gameState = 'IDLE'; // IDLE, AIMING, THROWING, SCORING, GAME_OVER
        this.currentPlayerIndex = 0;
        this.players = [];
        this.round = 1;
        this.winningScore = 75;
        this.isGameOver = false;
        this.isAiming = false;
        this.power = 0;
        this.maxPower = 20;
        this.powerIncreasing = true;
        this.angle = 0;
        this.maxAngle = Math.PI / 4; // 45 degrees in radians
        
        // Initialize the game
        this.init();
    }
    
    init() {
        // Set up Three.js
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupPhysics();
        
        // Create game objects
        this.createBoard();
        this.createPlayers();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 30);
    }
    
    setupCamera() {
        // Create a camera that's positioned behind the player's disc
        this.camera = new THREE.PerspectiveCamera(
            60, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        
        // Position camera behind the player's disc
        this.updateCameraPosition();
        
        // Set camera to look at the board
        this.camera.lookAt(0, 0, 0);
        
        // Add orbit controls for debugging (can be disabled in production)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.enableKeys = false;
    }
    
    updateCameraPosition() {
        // Position camera behind the current player's disc
        const player = this.players[this.currentPlayerIndex];
        const disc = player.getNextDisc();
        
        if (disc) {
            const distanceBehind = 2;
            const height = 1.5;
            
            // Calculate position behind the disc
            const angle = this.angle;
            const offsetX = Math.sin(angle) * distanceBehind;
            const offsetZ = Math.cos(angle) * distanceBehind;
            
            // Update camera position
            this.camera.position.set(
                disc.body.position.x + offsetX,
                height,
                disc.body.position.z + offsetZ
            );
            
            // Make camera look at the disc
            this.camera.lookAt(
                disc.body.position.x,
                disc.body.position.y + 0.1, // Look slightly above the disc
                disc.body.position.z
            );
        }
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        
        // Set up shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        
        this.scene.add(directionalLight);
        
        // Add a point light for better visibility
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
    }
    
    setupPhysics() {
        // Create a physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Earth gravity
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        // Create a default material
        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            {
                friction: 0.1,
                restitution: 0.3
            }
        );
        
        this.world.defaultContactMaterial = defaultContactMaterial;
        this.world.addContactMaterial(defaultContactMaterial);
    }
    
    createBoard() {
        this.board = new Board(this.scene, this.world);
    }
    
    createPlayers() {
        // Player 1 (human)
        const player1 = new Player(1, 0x3498db, this.scene, this.world);
        
        // Player 2 (AI for now, will be replaced with neural network later)
        const player2 = new Player(2, 0xe74c3c, this.scene, this.world, true);
        
        this.players = [player1, player2];
        
        // Position player 1's discs at the starting position
        this.positionPlayerDiscs(player1);
    }
    
    positionPlayerDiscs(player) {
        const startX = -0.4;
        const startZ = -14;
        const spacing = 0.2;
        
        player.discs.forEach((disc, index) => {
            disc.setPosition(startX + (index * spacing), 0.1, startZ);
        });
    }
    
    setupEventListeners() {
        // Mouse/touch controls for aiming and shooting
        window.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
        window.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
        window.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
        
        // Touch controls
        window.addEventListener('touchstart', (e) => this.onTouchStart(e), false);
        window.addEventListener('touchmove', (e) => this.onTouchMove(e), false);
        window.addEventListener('touchend', (e) => this.onTouchEnd(e), false);
        
        // Keyboard controls
        window.addEventListener('keydown', (e) => this.onKeyDown(e), false);
        window.addEventListener('keyup', (e) => this.onKeyUp(e), false);
        
        // New game button
        document.getElementById('new-game').addEventListener('click', () => this.resetGame());
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    onMouseDown(e) {
        if (this.gameState !== 'AIMING' || this.players[this.currentPlayerIndex].isAI) return;
        this.startAiming();
    }
    
    onMouseMove(e) {
        if (this.gameState !== 'AIMING' || !this.isAiming || this.players[this.currentPlayerIndex].isAI) return;
        
        // Calculate angle based on mouse position
        const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        this.angle = mouseX * this.maxAngle;
        this.updateCameraPosition();
    }
    
    onMouseUp(e) {
        if (this.gameState !== 'AIMING' || !this.isAiming || this.players[this.currentPlayerIndex].isAI) return;
        this.throwDisc();
    }
    
    onTouchStart(e) {
        e.preventDefault();
        if (this.gameState !== 'AIMING' || this.players[this.currentPlayerIndex].isAI) return;
        this.startAiming();
        this.lastTouchX = e.touches[0].clientX;
    }
    
    onTouchMove(e) {
        e.preventDefault();
        if (this.gameState !== 'AIMING' || !this.isAiming || this.players[this.currentPlayerIndex].isAI) return;
        
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - this.lastTouchX;
        this.lastTouchX = touchX;
        
        // Update angle based on touch movement
        this.angle = THREE.MathUtils.clamp(
            this.angle + deltaX * 0.01,
            -this.maxAngle,
            this.maxAngle
        );
        
        this.updateCameraPosition();
    }
    
    onTouchEnd(e) {
        e.preventDefault();
        if (this.gameState !== 'AIMING' || !this.isAiming || this.players[this.currentPlayerIndex].isAI) return;
        this.throwDisc();
    }
    
    onKeyDown(e) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (this.gameState !== 'AIMING' || currentPlayer.isAI) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                this.angle = Math.max(this.angle - 0.05, -this.maxAngle);
                this.updateCameraPosition();
                break;
                
            case 'ArrowRight':
                this.angle = Math.min(this.angle + 0.05, this.maxAngle);
                this.updateCameraPosition();
                break;
                
            case ' ':
                this.startAiming();
                break;
        }
    }
    
    onKeyUp(e) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (this.gameState !== 'AIMING' || !this.isAiming || currentPlayer.isAI) return;
        
        if (e.key === ' ') {
            this.throwDisc();
        }
    }
    
    startAiming() {
        this.isAiming = true;
        this.power = 0;
        this.powerIncreasing = true;
        
        // Show power meter
        document.getElementById('power-meter').style.display = 'block';
    }
    
    throwDisc() {
        if (!this.isAiming) return;
        
        this.isAiming = false;
        this.gameState = 'THROWING';
        
        // Hide power meter
        document.getElementById('power-meter').style.display = 'none';
        
        // Get current player and their next disc
        const currentPlayer = this.players[this.currentPlayerIndex];
        const disc = currentPlayer.getNextDisc();
        
        if (!disc) {
            this.nextTurn();
            return;
        }
        
        // Apply force to the disc
        const force = new CANNON.Vec3(
            Math.sin(this.angle) * this.power * 0.1,
            0,
            -Math.cos(this.angle) * this.power * 0.1
        );
        
        disc.body.velocity.copy(force);
        
        // Add some random spin
        disc.body.angularVelocity.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        
        // Mark the disc as thrown
        currentPlayer.discsThrown++;
        
        // Update UI
        this.updateUI();
    }
    
    nextTurn() {
        // Check if both players have thrown all their discs
        const allDiscsThrown = this.players.every(player => !player.hasDiscsLeft());
        
        if (allDiscsThrown) {
            this.scoreRound();
        } else {
            // Switch to the next player
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            
            // If the next player is AI, let it make a move
            if (this.players[this.currentPlayerIndex].isAI) {
                this.startAIMove();
            }
            
            this.updateUI();
            this.gameState = 'AIMING';
        }
    }
    
    startAIMove() {
        // Simple AI - will be replaced with neural network later
        setTimeout(() => {
            if (this.gameState !== 'AIMING') return;
            
            // Random power between 0.5 and 1.0
            this.power = 0.5 + Math.random() * 0.5;
            
            // Slight random angle (slightly to the left or right)
            this.angle = (Math.random() - 0.5) * 0.2;
            
            // Update camera to show AI's perspective
            this.updateCameraPosition();
            
            // Throw the disc after a short delay
            setTimeout(() => {
                this.throwDisc();
            }, 1000);
            
        }, 1000);
    }
    
    scoreRound() {
        this.gameState = 'SCORING';
        
        // Calculate scores for this round
        let roundScores = [];
        this.players.forEach((player, index) => {
            const score = player.calculateScore(this.board);
            roundScores.push({ player: index + 1, score });
        });
        
        // Update UI with round scores
        this.updateUI();
        
        // Check for game over
        const gameOver = this.players.some(player => player.score >= this.winningScore);
        
        if (gameOver) {
            this.endGame();
        } else {
            // Start a new round
            setTimeout(() => {
                this.startNewRound();
            }, 3000);
        }
    }
    
    startNewRound() {
        this.round++;
        this.currentPlayerIndex = 0;
        
        // Reset players for the new round
        this.players.forEach(player => {
            player.discsThrown = 0;
            player.discs.forEach(disc => {
                disc.hasBeenScored = false;
                disc.setPosition(0, 0.1, -14);
            });
        });
        
        // Update UI
        this.updateUI();
        
        // Start the next round
        this.gameState = 'AIMING';
    }
    
    endGame() {
        this.gameState = 'GAME_OVER';
        this.isGameOver = true;
        
        // Find the winner
        let winnerIndex = 0;
        let maxScore = -Infinity;
        
        this.players.forEach((player, index) => {
            if (player.score > maxScore) {
                maxScore = player.score;
                winnerIndex = index;
            } else if (player.score === maxScore) {
                // In case of a tie, it's a draw
                winnerIndex = -1;
            }
        });
        
        // Show game over screen
        const gameOverDiv = document.getElementById('game-over');
        const winnerText = document.getElementById('winner');
        
        if (winnerIndex === -1) {
            winnerText.textContent = "It's a draw!";
        } else {
            winnerText.textContent = `Player ${winnerIndex + 1} wins with ${maxScore} points!`;
        }
        
        gameOverDiv.classList.remove('hidden');
    }
    
    resetGame() {
        // Reset game state
        this.gameState = 'IDLE';
        this.currentPlayerIndex = 0;
        this.round = 1;
        this.isGameOver = false;
        
        // Reset players
        this.players.forEach(player => {
            player.reset();
            player.score = 0;
        });
        
        // Hide game over screen
        document.getElementById('game-over').classList.add('hidden');
        
        // Start a new game
        this.gameState = 'AIMING';
        this.updateUI();
    }
    
    updateUI() {
        // Update score display
        document.getElementById('player1-score').textContent = this.players[0].score;
        document.getElementById('player2-score').textContent = this.players[1].score;
        
        // Update turn indicator
        if (this.gameState === 'GAME_OVER') {
            document.getElementById('turn-indicator').textContent = 'Game Over';
        } else {
            const playerNum = this.currentPlayerIndex + 1;
            document.getElementById('turn-indicator').textContent = `Player ${playerNum}'s Turn`;
        }
        
        // Update power meter
        const powerMeter = document.getElementById('power-level');
        powerMeter.style.width = `${this.power * 100}%`;
    }
    
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        
        // Update physics
        this.world.step(1/60);
        
        // Update power meter when aiming
        if (this.isAiming) {
            if (this.powerIncreasing) {
                this.power += 0.01;
                if (this.power >= 1) {
                    this.power = 1;
                    this.powerIncreasing = false;
                }
            } else {
                this.power -= 0.01;
                if (this.power <= 0.5) {
                    this.power = 0.5;
                    this.powerIncreasing = true;
                }
            }
            
            // Update power meter
            document.getElementById('power-level').style.width = `${this.power * 100}%`;
        }
        
        // Update players and discs
        this.players.forEach(player => player.update());
        
        // Update camera position
        this.updateCameraPosition();
        
        // Update controls
        this.controls.update();
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Check if all discs have stopped moving
        if (this.gameState === 'THROWING') {
            const currentPlayer = this.players[this.currentPlayerIndex];
            const allDiscsStopped = !currentPlayer.hasMovingDiscs();
            
            if (allDiscsStopped) {
                this.nextTurn();
            }
        }
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    const game = new ShuffleboardGame();
    window.game = game; // Make game accessible from console for debugging
});

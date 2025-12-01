import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module';
import Board from './board.js';
import Player from './player.js';
import CameraController from './cameraController.js';
import InputHandler from './inputHandler.js';
import UIManager from './uiManager.js';
import { clamp, randomInt, lerp } from './utils.js';

class ShuffleboardGame {
    constructor() {
        try {
            console.log('Initializing ShuffleboardGame...');
            
            // Core Three.js objects
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.clock = new THREE.Clock();
            this.stats = null;
            
            // Physics
            this.world = null;
            this.timeStep = 1 / 60;
            this.maxSubSteps = 3;
            
            // Game objects
            this.board = null;
            this.players = [];
            this.currentPlayerIndex = 0;
            this.discs = [];
            
            // Game state
            this.gameState = 'loading'; // loading, menu, playing, paused, gameOver
            this.isPaused = false;
            this.scores = [0, 0];
            this.winningScore = 75;
            this.round = 1;
            this.turnTimeLimit = 30; // seconds
            this.turnTimer = 0;
            this.turnTimerInterval = null;
            
            // Debug mode
            this.debug = {
                enabled: false,
                logStateChanges: true,
                logInput: false
            };
            
            // UI
            this.ui = new UIManager();
            this.input = new InputHandler(this);
            this.cameraController = null;
            
            // Settings
            this.settings = {
                graphics: {
                    quality: 'medium', // low, medium, high
                    shadows: true,
                    antialias: true,
                    pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
                },
                audio: {
                    masterVolume: 0.7,
                    musicVolume: 0.5,
                    sfxVolume: 0.8,
                    enabled: true
                },
                controls: {
                    sensitivity: 0.002,
                    invertY: false,
                    keybinds: {
                        forward: 'KeyW',
                        back: 'KeyS',
                        left: 'KeyA',
                        right: 'KeyD',
                        jump: 'Space',
                        menu: 'Escape'
                    }
                },
                game: {
                    difficulty: 'medium', // easy, medium, hard
                    aiEnabled: true,
                    turnTimeLimit: 30,
                    winningScore: 75,
                    cameraMode: 'follow' // follow, free, orbit
                }
            };
            
            // Bind methods that are used as event handlers
            this.onWindowResize = this.onWindowResize.bind(this);
            this.animate = this.animate.bind(this);
            
            // Initialize the game
            this.init().catch(error => {
                console.error('Failed to initialize game:', error);
                this.ui.showError('Failed to initialize game. Please check the console for details.');
            });
            
        } catch (error) {
            console.error('Error in ShuffleboardGame constructor:', error);
            throw error;
        }
    }

    async init() {
        try {
            console.log('Initializing game...');
            
            // Initialize UI
            console.log('Initializing UI...');
            this.ui.init(this);
            this.ui.updateLoadingText('Initializing game...');
            
            // Set up scene (this will also set up the camera)
            console.log('Setting up scene...');
            this.ui.updateLoadingText('Setting up scene...');
            try {
                await this.setupScene();
                console.log('Scene setup complete');
            } catch (error) {
                console.error('Error in setupScene:', error);
                throw error;
            }
            
            console.log('Setting up physics...');
            this.ui.updateLoadingText('Setting up physics...');
            this.setupPhysics();
            
            // Store world in scene's userData for easy access
            this.scene.userData.world = this.world;
            
            console.log('Creating game board...');
            this.ui.updateLoadingText('Creating game board...');
            this.board = new Board(this.scene, this.world);
            
            console.log('Setting up lights...');
            this.ui.updateLoadingText('Setting up lighting...');
            this.setupLights();
            
            console.log('Setting up players...');
            this.ui.updateLoadingText('Setting up players...');
            this.setupPlayers();
            
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            
            console.log('Loading settings...');
            this.loadSettings();
            
            // Add a small delay to ensure everything is loaded
            console.log('Finalizing initialization...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('Hiding loading screen...');
            this.ui.hideLoadingScreen();
            
            console.log('Showing main menu...');
            this.showMainMenu();
            
            console.log('Starting game loop...');
            this.animate();
            
            console.log('Game initialization complete');
            
        } catch (error) {
            console.error('Error initializing game:', error);
            this.ui.showError('Error loading game: ' + (error.message || 'Unknown error'));
            
            // Ensure loading screen is hidden even on error
            try {
                this.ui.hideLoadingScreen();
            } catch (e) {
                console.error('Error hiding loading screen:', e);
            }
        }
    }

    async setupScene() {
        try {
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({
                antialias: this.settings.graphics.antialias,
                alpha: true,
                antialias: true
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = this.settings.graphics.shadows;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
            
            // Add renderer to container
            const container = document.getElementById('game-container');
            if (!container) {
                throw new Error('Game container element not found');
            }
            
            // Clear the container and append the renderer
            container.innerHTML = '';
            container.appendChild(this.renderer.domElement);
            
            // Force a reflow to ensure the DOM is updated
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Setup camera after renderer is in the DOM
            this.setupCamera();
            
            // Handle window resize
            window.addEventListener('resize', () => this.onWindowResize(), false);
            
            // Add stats for performance monitoring (optional)
            try {
                this.stats = new Stats();
                this.stats.dom.style.position = 'absolute';
                this.stats.dom.style.top = '10px';
                this.stats.dom.style.left = '10px';
                this.stats.dom.style.display = 'none'; // Hidden by default
                container.appendChild(this.stats.dom);
            } catch (e) {
                console.warn('Could not initialize Stats:', e);
                this.stats = null;
            }
            
        } catch (error) {
            console.error('Error setting up scene:', error);
            throw error;
        }
    }

    setupCamera() {
        try {
            // Create camera with aspect ratio based on window size
            const aspect = window.innerWidth / window.innerHeight;
            this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
            
            // Initialize camera controller
            this.cameraController = new CameraController(this.camera, this.renderer.domElement);
            
            // Set initial camera position based on game mode
            this.cameraController.resetCamera();
        } catch (error) {
            console.error('Error in setupCamera:', error);
            throw error;
        }
    }

    setupPhysics() {
        // Create physics world with improved settings
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -15, 0), // Slightly stronger gravity for better physics
            broadphase: new CANNON.SAPBroadphase(),
            defaultContactMaterial: {
                friction: 0.3,
                restitution: 0.5,
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e6,
                frictionEquationRelaxation: 2
            },
            solver: new CANNON.GSSolver()
        });
        
        // Optimize physics simulation
        this.world.allowSleep = true;
        this.world.broadphase.useBoundingBoxes = true;
        this.world.defaultContactMaterial.contactEquationStiffness = 1e9;
        this.world.defaultContactMaterial.contactEquationRelaxation = 4;
        
        // Set solver iterations based on performance
        this.world.solver.iterations = 10;
        this.world.solver.tolerance = 0.1;
        
        // Materials
        const groundMaterial = new CANNON.Material('groundMaterial');
        const wheelMaterial = new CANNON.Material('wheelMaterial');
        
        // Contact material between wheel and ground
        const wheelGroundContactMaterial = new CANNON.ContactMaterial(
            wheelMaterial,
            groundMaterial,
            {
                friction: 0.3,
                restitution: 0.7,
                contactEquationStiffness: 1000
            }
        );
        this.world.addContactMaterial(wheelGroundContactMaterial);
        
        // Create ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0, // Static body
            shape: groundShape,
            material: groundMaterial
        });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
        
        // Store materials for later use
        this.materials = {
            ground: groundMaterial,
            wheel: wheelMaterial
        };
    }

    setupPlayers() {
        try {
            // Clear any existing players
            this.players = [];
            
            // Create player 1 (human)
            const player1 = new Player(0, false); // Player 1 is human
            this.players.push(player1);
            
            // Create player 2 (AI if enabled, otherwise human)
            const player2 = new Player(1, this.settings.game.aiEnabled);
            this.players.push(player2);
            
            // Set current player to player 1
            this.currentPlayerIndex = 0;
            
            // Initialize scores
            this.scores = [0, 0];
            
            // Update UI with player information
            this.ui.updatePlayerInfo(this.players[0], this.players[1]);
            
        } catch (error) {
            console.error('Error setting up players:', error);
            throw error;
        }
    }

    setupLights() {
        // Clear existing lights
        while(this.scene.children.length > 0) {
            const obj = this.scene.children[0];
            if (obj.isLight) {
                this.scene.remove(obj);
            } else {
                break;
            }
        }
        
        // Ambient light - provides base illumination
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);
        
        // Main directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(10, 20, 10);
        this.sunLight.castShadow = this.settings.graphics.shadows;
        
        if (this.settings.graphics.shadows) {
            // Configure shadow properties
            this.sunLight.shadow.mapSize.width = 2048;
            this.sunLight.shadow.mapSize.height = 2048;
            this.sunLight.shadow.camera.near = 0.5;
            this.sunLight.shadow.camera.far = 50;
            this.sunLight.shadow.camera.left = -20;
            this.sunLight.shadow.camera.right = 20;
            this.sunLight.shadow.camera.top = 20;
            this.sunLight.shadow.camera.bottom = -20;
            this.sunLight.shadow.bias = -0.0005;
            this.sunLight.shadow.normalBias = 0.05;
        }
        
        this.scene.add(this.sunLight);
        
        // Hemisphere light for more natural outdoor lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);
        
        // Fill lights to reduce harsh shadows
        const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight1.position.set(-10, 5, -5);
        this.scene.add(fillLight1);
        
        const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
        fillLight2.position.set(0, -5, -10);
        this.scene.add(fillLight2);
        
        // Add some point lights for highlights
        const pointLight1 = new THREE.PointLight(0x4a90e2, 1, 20);
        pointLight1.position.set(5, 5, 5);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xe24a4a, 0.8, 15);
        pointLight2.position.set(-5, 3, -5);
        this.scene.add(pointLight2);
        
        // Store lights for later reference
        this.lights = {
            ambient: ambientLight,
            sun: this.sunLight,
            hemi: hemiLight,
            fill1: fillLight1,
            fill2: fillLight2,
            point1: pointLight1,
            point2: pointLight2
        };
    }

    startTurn() {
        // Update game state
        this.gameState = 'aiming';
        const currentPlayer = this.getCurrentPlayer();
        
        // Reset disc positions if needed
        if (currentPlayer.discs.every(disc => disc.hasBeenShot)) {
            currentPlayer.resetDiscs();
        }
        
        // Update camera for current player
        this.updateCameraForPlayer();
        
        // Start turn timer
        this.startTurnTimer();
        
        // Update UI
        this.ui.updateTurnIndicator(this.currentPlayerIndex + 1);
        this.ui.updateScores(this.scores[0], this.scores[1]);
        this.ui.showMessage(`Player ${this.currentPlayerIndex + 1}'s turn`, 1000);
        
        // If it's the AI's turn, let it take a shot after a short delay
        if (currentPlayer.isAI) {
            const aiDelay = 1000 + Math.random() * 1500; // 1-2.5 second delay
            this.aiTimeout = setTimeout(() => this.aiTakeTurn(), aiDelay);
        }
    }

    aiTakeTurn() {
        if (this.gameState === 'gameOver') return;
        
        const aiPlayer = this.getCurrentPlayer();
        const targetDisc = aiPlayer.getNextDisc();
        
        if (!targetDisc) {
            this.endTurn();
            return;
        }
        
        // AI difficulty settings
        const difficulty = this.settings.game.difficulty;
        let angleVariance, powerVariance, minPower, maxPower, accuracy;
        
        switch (difficulty) {
            case 'easy':
                angleVariance = Math.PI / 6; // 30 degrees
                powerVariance = 0.6;
                minPower = 0.2;
                maxPower = 0.8;
                accuracy = 0.6; // 60% accuracy
                break;
            case 'hard':
                angleVariance = Math.PI / 12; // 15 degrees
                powerVariance = 0.3;
                minPower = 0.4;
                maxPower = 0.9;
                accuracy = 0.9; // 90% accuracy
                break;
            case 'medium':
            default:
                angleVariance = Math.PI / 9; // 20 degrees
                powerVariance = 0.45;
                minPower = 0.3;
                maxPower = 0.85;
                accuracy = 0.75; // 75% accuracy
        }
        
        // Calculate target position (aim for high-scoring zones)
        let targetX = 0;
        let targetZ = 10; // Default to center
        
        // AI strategy based on game state
        if (Math.random() < accuracy) {
            // Try to aim for high-scoring zones
            const zone = Math.random();
            if (zone < 0.4) {
                // Aim for center (10 points)
                targetX = (Math.random() - 0.5) * 0.5;
                targetZ = 9.5 + Math.random() * 0.5;
            } else if (zone < 0.7) {
                // Aim for medium zones (7-8 points)
                targetX = (Math.random() - 0.5) * 2;
                targetZ = 8 + Math.random() * 1.5;
            } else {
                // Try to knock opponent's discs
                const opponentDiscs = this.getOpponentDiscs();
                if (opponentDiscs.length > 0) {
                    const targetDisc = opponentDiscs[Math.floor(Math.random() * opponentDiscs.length)];
                    const discPos = targetDisc.getPosition();
                    targetX = discPos.x + (Math.random() - 0.5) * 0.5;
                    targetZ = discPos.z + (Math.random() - 0.5) * 0.5;
                }
            }
        } else {
            // Miss intentionally based on difficulty
            targetX = (Math.random() - 0.5) * 4;
            targetZ = 7 + Math.random() * 4;
        }
        
        // Calculate angle and power to reach target
        const dx = targetX - 0; // Starting x is 0
        const dz = targetZ - (-5); // Starting z is -5
        let angle = Math.atan2(dx, dz);
        
        // Add some randomness based on difficulty
        angle += (Math.random() * 2 - 1) * angleVariance;
        
        // Calculate distance for power
        const distance = Math.sqrt(dx * dx + dz * dz);
        let power = clamp(distance / 15, minPower, maxPower);
        
        // Add some randomness to power
        power *= 1 + (Math.random() * 2 - 1) * powerVariance;
        power = clamp(power, 0.1, 1.0);
        
        // Set disc position and rotation
        targetDisc.setPosition(0, 0.1, -5);
        targetDisc.setRotation(0, angle, 0);
        
        // Visualize AI aim (for debugging)
        if (this.debugMode) {
            this.debugAim(targetX, targetZ);
        }
        
        // Show AI is taking a shot
        this.ui.showMessage('AI is taking a shot...', 500);
        
        // Shoot the disc after a short delay
        setTimeout(() => {
            if (this.gameState !== 'gameOver') {
                targetDisc.shoot(power);
                this.waitForDiscToStop(targetDisc);
            }
        }, 500);
    }

    endTurn() {
        if (this.gameState === 'gameOver') return;
        
        // Clear any pending timeouts
        if (this.aiTimeout) {
            clearTimeout(this.aiTimeout);
            this.aiTimeout = null;
        }
        
        // Stop turn timer
        this.stopTurnTimer();
        
        // Switch to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        
        // Check if next player has any discs left
        const nextPlayer = this.getCurrentPlayer();
        if (nextPlayer.getRemainingDiscs() === 0) {
            // If no discs left, skip to next player or end round
            this.endRound();
            return;
        }
        
        // Start next turn
        this.startTurn();
    }

    checkScoring() {
        if (this.gameState === 'gameOver') return;
        
        // Update all disc positions in the physics world
        this.world.step(this.timeStep);
        
        // Get all discs from both players
        const allDiscs = [];
        this.players.forEach(player => {
            allDiscs.push(...player.discs);
        });
        
        // Check scoring for each disc
        let scoringDiscs = [];
        
        allDiscs.forEach(disc => {
            if (disc.hasBeenShot && !disc.hasBeenScored) {
                const position = disc.getPosition();
                const score = this.board.getScoreForPosition(position.x, position.z);
                
                if (score !== null) {
                    disc.score = score.value;
                    disc.scoreType = score.type;
                    disc.hasBeenScored = true;
                    scoringDiscs.push(disc);
                    
                    // Update player score
                    const playerIndex = this.players.findIndex(p => p.discs.includes(disc));
                    if (playerIndex !== -1) {
                        this.scores[playerIndex] += score.value;
                        
                        // Show score popup
                        this.ui.showScorePopup(
                            position.x,
                            position.z,
                            score.value,
                            score.type
                        );
                        
                        // Play sound
                        this.playSound('score', score.value >= 5 ? 1.0 : 0.7);
                    }
                } else if (this.board.isOutOfBounds(position.x, position.z)) {
                    // Disc is out of bounds
                    disc.score = 0;
                    disc.scoreType = 'out';
                    disc.hasBeenScored = true;
                    scoringDiscs.push(disc);
                    
                    // Play sound
                    this.playSound('miss', 0.5);
                }
            }
        });
        
        // Check for game over condition
        const winningPlayer = this.checkWinCondition();
        if (winningPlayer !== null) {
            this.endGame(winningPlayer);
            return;
        }
        
        // If all discs have been shot and scored, end the round
        const allDiscsShot = allDiscs.every(disc => disc.hasBeenShot);
        if (allDiscsShot) {
            this.endRound();
        } else {
            // Continue to next turn
            this.endTurn();
        }
    }

    checkWinCondition() {
        // Check if any player has won
        // Return player index or null if no winner yet
        return null; // Placeholder
    }

    gameOver(winnerIndex) {
        this.gameState = 'gameOver';
        this.stopTurnTimer();
        
        // Show game over screen
        this.ui.showGameOver(winnerIndex, this.scores, () => {
            // Play again callback
            this.showMainMenu();
        });
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update camera
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(this.settings.graphics.pixelRatio);
        
        // Update UI if available
        if (this.ui && typeof this.ui.onWindowResize === 'function') {
            this.ui.onWindowResize(width, height);
        } else if (this.debug.enabled) {
            console.debug('UI manager not available or missing onWindowResize method');
        }
        
        if (this.debug.enabled) {
            console.debug(`Window resized to ${width}x${height}`);
        }
    }

    animate() {
        try {
            // Start stats if available
            if (this.stats) {
                this.stats.begin();
            }
            
            // Calculate delta time
            const delta = this.clock.getDelta();
            
            // Update physics
            if (this.world && !this.isPaused) {
                this.world.step(this.timeStep, delta, this.maxSubSteps);
            }
            
            // Update game objects
            if (this.board && this.board.update) {
                this.board.update(delta);
            }
            
            // Update players
            this.players.forEach(player => {
                if (player && player.update) {
                    player.update(delta);
                }
            });
            
            // Update camera controller
            if (this.cameraController && this.cameraController.update) {
                this.cameraController.update(delta);
            }
            
            // Render the scene
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            
            // End stats if available
            if (this.stats) {
                this.stats.end();
            }
            
            // Continue the animation loop
            this.animationFrameId = requestAnimationFrame(this.animate);
            
        } catch (error) {
            console.error('Error in animation loop:', error);
            // Try to recover by continuing the animation loop
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
            this.animationFrameId = requestAnimationFrame(this.animate);
        }
    }

    /**
     * Clean up resources and remove event listeners
     */
    cleanup() {
    try {
        console.log('Cleaning up game resources...');
        
        // Stop the animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        
        // Clean up Three.js resources
        if (this.scene) {
            // Dispose of geometries, materials, and textures
            this.scene.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            if (material.map) material.map.dispose();
                            if (material.lightMap) material.lightMap.dispose();
                            if (material.bumpMap) material.bumpMap.dispose();
                            if (material.normalMap) material.normalMap.dispose();
                            if (material.specularMap) material.specularMap.dispose();
                            if (material.envMap) material.envMap.dispose();
                            material.dispose();
                        });
                    } else {
                        const material = object.material;
                        if (material.map) material.map.dispose();
                        if (material.lightMap) material.lightMap.dispose();
                        if (material.bumpMap) material.bumpMap.dispose();
                        if (material.normalMap) material.normalMap.dispose();
                        if (material.specularMap) material.specularMap.dispose();
                        if (material.envMap) material.envMap.dispose();
                        material.dispose();
                    }
                }
            });
            
            // Clear the scene
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
            this.scene = null;
        }
        
        // Clean up physics world
        if (this.world) {
            // Remove all bodies
            while (this.world.bodies.length > 0) {
                this.world.removeBody(this.world.bodies[0]);
            }
            this.world = null;
        }
        
        // Clean up renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }
        
        // Clean up camera controller
        if (this.cameraController) {
            if (typeof this.cameraController.dispose === 'function') {
                this.cameraController.dispose();
            }
            this.cameraController = null;
        }
        
        // Clean up UI
        if (this.ui && typeof this.ui.cleanup === 'function') {
            this.ui.cleanup();
        }
        
        // Clean up input
        if (this.input && typeof this.input.cleanup === 'function') {
            this.input.cleanup();
        }
        
        // Clean up stats
        if (this.stats) {
            const statsElement = this.stats.dom;
            if (statsElement && statsElement.parentNode) {
                statsElement.parentNode.removeChild(statsElement);
            }
            this.stats = null;
        }
        
        console.log('Game cleanup completed');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}
}


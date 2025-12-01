console.log('[DEBUG] Starting game.js execution');

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module';
import Board from './board.js';

console.log('[DEBUG] All imports loaded successfully');
import Player from './player.js';
import CameraController from './cameraController.js';
import InputHandler from './inputHandler.js';
import UIManager from './uiManager.js';
import { clamp, randomInt, lerp } from './utils.js';

class ShuffleboardGame {
    constructor() {
        console.log('[DEBUG] ShuffleboardGame constructor called');
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
            
            // Game state management
            this.state = {
                value: 'loading', // loading, menu, playing, paused, gameOver
                validStates: new Set(['loading', 'menu', 'playing', 'paused', 'gameOver']),
                onStateChangeCallbacks: new Set(),
                isPaused: false
            };
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
            
            // State management methods
            this.getState = () => this.state.value;
            
            this.setState = (newState) => {
                if (!this.state.validStates.has(newState)) {
                    console.warn(`Invalid game state: ${newState}`);
                    return;
                }
                
                if (this.debug.logStateChanges) {
                    console.log(`Game state: ${this.state.value} -> ${newState}`);
                }
                
                const oldState = this.state.value;
                this.state.value = newState;
                
                // Notify listeners of state change
                this.state.onStateChangeCallbacks.forEach(callback => {
                    try {
                        callback(newState, oldState);
                    } catch (error) {
                        console.error('Error in state change callback:', error);
                    }
                });
            };
            
            this.onStateChange = (callback) => {
                if (typeof callback === 'function') {
                    this.state.onStateChangeCallbacks.add(callback);
                    return () => this.state.onStateChangeCallbacks.delete(callback);
                }
                return () => {};
            };
            
            // Bind methods that are used as event handlers
            this.onWindowResize = () => {
                try {
                    if (!this.renderer || !this.camera) return;
                    
                    const width = window.innerWidth;
                    const height = window.innerHeight;
                    
                    this.camera.aspect = width / height;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(width, height);
                    
                    if (this.cameraController?.onWindowResize) {
                        this.cameraController.onWindowResize();
                    }
                } catch (error) {
                    console.error('Error in window resize handler:', error);
                }
            };
            
            this.animate = () => {
                // Animation loop
            };
            
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
        console.log('[DEBUG] init() method started');
        try {
            console.log('Initializing game...');
            
            // Initialize UI
            console.log('[DEBUG] Initializing UI...');
            if (!this.ui) {
                throw new Error('UI manager not initialized');
            }
            await this.ui.init(this);
            this.ui.updateLoadingText('Initializing game...');
            console.log('[DEBUG] UI initialized');
            
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
            this.setupEventListeners = () => {
                try {
                    console.log('[DEBUG] Setting up game event listeners...');
                    
                    // Window resize handler
                    window.addEventListener('resize', this.onWindowResize);
                    
                    // UI event listeners
                    if (this.ui) {
                        // Game controls
                        this.ui.on('startGame', () => this.startGame());
                        this.ui.on('pauseGame', () => this.togglePause());
                        this.ui.on('resumeGame', () => this.resumeGame());
                        this.ui.on('quitToMenu', () => this.returnToMainMenu());
                        this.ui.on('restartGame', () => this.restartGame());
                        
                        // Settings changes
                        this.ui.on('volumeChange', (volume) => {
                            this.settings.audio.masterVolume = volume;
                            this.applyAudioSettings();
                        });
                        
                        this.ui.on('graphicsQualityChange', (quality) => {
                            this.settings.graphics.quality = quality;
                            this.applyGraphicsSettings();
                        });
                        
                        // Player actions
                        this.ui.on('playerShoot', (power, angle) => {
                            if (this.getState() === 'playing' && this.currentPlayer) {
                                this.currentPlayer.shoot(power, angle);
                            }
                        });
                        
                        // Error handling
                        this.ui.on('error', (error) => {
                            console.error('UI Error:', error);
                            this.showError(error.message || 'An unknown UI error occurred');
                        });
                    }
                    
                    // Input handling
                    if (this.input) {
                        // Keyboard controls
                        this.input.on('keydown', (key) => this.handleKeyDown(key));
                        this.input.on('keyup', (key) => this.handleKeyUp(key));
                        
                        // Mouse/touch controls
                        this.input.on('pointerdown', (position) => this.handlePointerDown(position));
                        this.input.on('pointermove', (position) => this.handlePointerMove(position));
                        this.input.on('pointerup', (position) => this.handlePointerUp(position));
                    }
                    
                    // Game state change listeners
                    this.onStateChange((newState, oldState) => {
                        console.log(`[DEBUG] Game state changed: ${oldState} -> ${newState}`);
                        
                        // Update UI based on state changes
                        if (this.ui) {
                            switch (newState) {
                                case 'menu':
                                    this.ui.showScreen('menu');
                                    break;
                                case 'playing':
                                    this.ui.showScreen('game');
                                    break;
                                case 'paused':
                                    this.ui.showMessage('Game Paused', 'The game is paused', 'Resume', () => this.resumeGame());
                                    break;
                                case 'gameOver':
                                    this.ui.showScreen('gameOver');
                                    break;
                            }
                        }
                    });
                    
                    console.log('[DEBUG] Game event listeners set up successfully');
                    
                } catch (error) {
                    console.error('Error setting up event listeners:', error);
                    throw error;
                }
            };
            
            this.setupEventListeners();
            
            console.log('Loading settings...');
            this.loadSettings();
            
            // Add a small delay to ensure everything is loaded
            console.log('Finalizing initialization...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('[DEBUG] Hiding loading screen...');
            this.ui.hideLoadingScreen();
            console.log('[DEBUG] Loading screen hidden');
            
            console.log('[DEBUG] Showing main menu...');
            this.showMainMenu();
            console.log('[DEBUG] Main menu shown');
            
            console.log('[DEBUG] Starting game loop...');
            this.animate();
            console.log('[DEBUG] Game loop started');
            
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
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            
            // Initialize camera controller with renderer instance, not just the DOM element
            this.cameraController = new CameraController(this.camera, this.renderer);
            
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
            return this.camera;
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
            
            // Make sure scene has world reference
            this.scene.userData.world = this.world;
            
            // Create player 1 (human)
            const player1 = new Player(this.scene, false); // Pass scene and isAI flag
            this.players.push(player1);
            
            // Create player 2 (AI if enabled, otherwise human)
            const player2 = new Player(this.scene, this.settings.game.aiEnabled);
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

    /**
     * Loads settings from localStorage and merges them with default settings
     */
    loadSettings() {
        try {
            console.log('[DEBUG] Loading settings...');
            
            // Try to load settings from localStorage
            const savedSettings = localStorage.getItem('shuffleboardSettings');
            
            if (savedSettings) {
                try {
                    const parsedSettings = JSON.parse(savedSettings);
                    // Merge saved settings with defaults
                    this.settings = {
                        ...this.settings,  // Default settings
                        ...parsedSettings, // Override with saved settings
                        // Ensure nested objects are properly merged
                        graphics: {
                            ...this.settings.graphics,
                            ...(parsedSettings.graphics || {})
                        },
                        audio: {
                            ...this.settings.audio,
                            ...(parsedSettings.audio || {})
                        },
                        controls: {
                            ...this.settings.controls,
                            ...(parsedSettings.controls || {}),
                            keybinds: {
                                ...this.settings.controls.keybinds,
                                ...(parsedSettings.controls?.keybinds || {})
                            }
                        },
                        game: {
                            ...this.settings.game,
                            ...(parsedSettings.game || {})
                        }
                    };
                    console.log('[DEBUG] Settings loaded from localStorage');
                } catch (e) {
                    console.warn('Error parsing saved settings, using defaults', e);
                }
            } else {
                console.log('[DEBUG] No saved settings found, using defaults');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    /**
     * Shows the main menu screen and sets up the game state
     */
    showMainMenu() {
        try {
            console.log('[DEBUG] Showing main menu');
            
            // Update game state
            this.setState('menu');
            
            // Reset camera position for menu
            if (this.camera && this.cameraController) {
                this.cameraController.resetCamera();
            }
            
            // Show main menu in UI
            if (this.ui) {
                this.ui.showScreen('mainMenu');
                
                // Set up menu event listeners if not already set
                if (!this._menuListenersSet) {
                    this.ui.on('startGame', () => this.startGame());
                    this.ui.on('openSettings', () => this.showSettings());
                    this.ui.on('quitGame', () => this.quitGame());
                    this._menuListenersSet = true;
                }
            }
            
            // Pause the game if it was running
            if (this.getState() === 'playing') {
                this.pauseGame();
            }
            
            console.log('[DEBUG] Main menu shown');
        } catch (error) {
            console.error('Error showing main menu:', error);
            this.ui?.showError('Failed to show main menu');
        }
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
        try {
            if (this.gameState === 'gameOver') return;
            
            this.gameState = 'gameOver';
            this.stopTurnTimer();
            
            // Show game over screen if UI is available
            if (this.ui && typeof this.ui.showGameOver === 'function') {
                this.ui.showGameOver(winnerIndex, this.scores, () => {
                    // Play again callback
                    if (typeof this.showMainMenu === 'function') {
                        this.showMainMenu();
                    }
                });
            }
            
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Update camera if available
            if (this.camera) {
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
            }
            
            // Update renderer if available
            if (this.renderer) {
                this.renderer.setSize(width, height);
                if (this.settings?.graphics?.pixelRatio) {
                    this.renderer.setPixelRatio(this.settings.graphics.pixelRatio);
                }
            }
            
            // Update UI if available
            if (this.ui) {
                if (typeof this.ui.onWindowResize === 'function') {
                    this.ui.onWindowResize(width, height);
                } else if (this.debug?.enabled) {
                    console.debug('UI manager missing onWindowResize method');
                }
            } else if (this.debug?.enabled) {
                console.debug('UI manager not available');
            }
        } catch (error) {
            console.error('Error in gameOver:', error);
            // Try to show error in UI if possible
            if (this.ui?.showError) {
                this.ui.showError('Error in game over sequence: ' + (error.message || 'Unknown error'));
            }
        }
        
        if (this.debug.enabled) {
            console.debug(`Window resized to ${width}x${height}`);
        }
    }

    animate = () => {
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
    cleanup = () => {
        try {
            console.log('Cleaning up game resources...');
            
            // Stop the animation loop
            if (this.animationFrameId) {
                try {
                    cancelAnimationFrame(this.animationFrameId);
                } catch (e) {
                    console.warn('Error canceling animation frame:', e);
                }
                this.animationFrameId = null;
            }
            
            // Remove event listeners safely
            try {
                window.removeEventListener('resize', this.onWindowResize);
            } catch (e) {
                console.warn('Error removing resize event listener:', e);
            }
            
            // Clean up Three.js resources
            if (this.scene) {
                try {
                    // Dispose of geometries, materials, and textures
                    this.scene.traverse(object => {
                        try {
                            if (object?.geometry) {
                                try {
                                    object.geometry.dispose();
                                } catch (e) {
                                    console.warn('Error disposing geometry:', e);
                                }
                            }
                            
                            if (object?.material) {
                                try {
                                    if (Array.isArray(object.material)) {
                                        object.material.forEach(material => this.disposeMaterial(material));
                                    } else {
                                        this.disposeMaterial(object.material);
                                    }
                                } catch (e) {
                                    console.warn('Error disposing material:', e);
                                }
                            }
                        } catch (e) {
                            console.warn('Error traversing scene object:', e);
                        }
                    });
                    
                    // Clear the scene
                    while (this.scene.children?.length > 0) {
                        try {
                            this.scene.remove(this.scene.children[0]);
                        } catch (e) {
                            console.warn('Error removing scene child:', e);
                            break; // Prevent infinite loop
                        }
                    }
                } catch (e) {
                    console.error('Error cleaning up scene:', e);
                } finally {
                    this.scene = null;
                }
            }
            
            // Clean up physics world
            if (this.world?.bodies) {
                try {
                    // Remove all bodies safely
                    while (this.world.bodies.length > 0) {
                        try {
                            this.world.removeBody(this.world.bodies[0]);
                        } catch (e) {
                            console.warn('Error removing physics body:', e);
                            break; // Prevent infinite loop
                        }
                    }
                } catch (e) {
                    console.error('Error cleaning up physics world:', e);
                } finally {
                    this.world = null;
                }
            }
            
            // Clean up renderer
            if (this.renderer) {
                try {
                    if (typeof this.renderer.dispose === 'function') {
                        this.renderer.dispose();
                    }
                    
                    if (typeof this.renderer.forceContextLoss === 'function') {
                        try {
                            const gl = this.renderer.getContext();
                            if (gl && typeof gl.getExtension === 'function') {
                                const loseContext = gl.getExtension('WEBGL_lose_context');
                                if (loseContext) {
                                    loseContext.loseContext();
                                }
                            }
                        } catch (e) {
                            console.warn('Error forcing WebGL context loss:', e);
                        }
                    }
                    
                    if (this.renderer.domElement?.parentNode) {
                        try {
                            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                        } catch (e) {
                            console.warn('Error removing renderer DOM element:', e);
                        }
                    }
                } catch (e) {
                    console.error('Error cleaning up renderer:', e);
                } finally {
                    this.renderer = null;
                }
            }
            
            // Clean up camera controller
            if (this.cameraController) {
                try {
                    if (typeof this.cameraController.dispose === 'function') {
                        this.cameraController.dispose();
                    }
                } catch (e) {
                    console.error('Error cleaning up camera controller:', e);
                } finally {
                    this.cameraController = null;
                }
            }
            
            // Clean up UI
            if (this.ui) {
                try {
                    if (typeof this.ui.cleanup === 'function') {
                        this.ui.cleanup();
                    }
                } catch (e) {
                    console.error('Error cleaning up UI:', e);
                }
            }
            
            // Clean up input
            if (this.input) {
                try {
                    if (typeof this.input.cleanup === 'function') {
                        this.input.cleanup();
                    }
                } catch (e) {
                    console.error('Error cleaning up input:', e);
                }
            }
            
            // Clean up stats
            if (this.stats) {
                try {
                    const statsElement = this.stats.dom;
                    if (statsElement?.parentNode) {
                        statsElement.parentNode.removeChild(statsElement);
                    }
                } catch (e) {
                    console.warn('Error removing stats element:', e);
                } finally {
                    this.stats = null;
                }
            }
            
            console.log('Game cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
    
    /**
     * Helper method to safely dispose of a material and its textures
     * @param {THREE.Material} material - The material to dispose
     */
    disposeMaterial(material) {
        if (!material) return;
        
        try {
            // Dispose of textures
            const textureProps = [
                'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 
                'envMap', 'alphaMap', 'aoMap', 'displacementMap', 'emissiveMap',
                'metalnessMap', 'roughnessMap', 'clearcoatMap', 'clearcoatNormalMap',
                'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap',
                'transmissionMap', 'thicknessMap', 'specularIntensityMap',
                'specularColorMap', 'iridescenceMap', 'iridescenceThicknessMap'
            ];
            
            textureProps.forEach(prop => {
                try {
                    const texture = material[prop];
                    if (texture && typeof texture.dispose === 'function') {
                        texture.dispose();
                    }
                } catch (e) {
                    console.warn(`Error disposing ${prop}:`, e);
                }
            });
            
            // Dispose of material
            if (typeof material.dispose === 'function') {
                material.dispose();
            }
        } catch (e) {
            console.warn('Error in disposeMaterial:', e);
        }
    }
    
    /**
     * Sets up all game event listeners
     * @private
     */
    setupEventListeners() {
        try {
            console.log('[DEBUG] Setting up game event listeners...');
            
            // Window resize handler
            window.addEventListener('resize', this.onWindowResize);
            
            // UI event listeners
            if (this.ui) {
                // Game controls
                this.ui.on('startGame', () => this.startGame());
                this.ui.on('pauseGame', () => this.togglePause());
                this.ui.on('resumeGame', () => this.resumeGame());
                this.ui.on('quitToMenu', () => this.returnToMainMenu());
                this.ui.on('restartGame', () => this.restartGame());
                
                // Settings changes
                this.ui.on('volumeChange', (volume) => {
                    this.settings.audio.masterVolume = volume;
                    this.applyAudioSettings();
                });
                
                this.ui.on('graphicsQualityChange', (quality) => {
                    this.settings.graphics.quality = quality;
                    this.applyGraphicsSettings();
                });
                
                // Player actions
                this.ui.on('playerShoot', (power, angle) => {
                    if (this.getState() === 'playing' && this.currentPlayer) {
                        this.currentPlayer.shoot(power, angle);
                    }
                });
                
                // Error handling
                this.ui.on('error', (error) => {
                    console.error('UI Error:', error);
                    this.showError(error.message || 'An unknown UI error occurred');
                });
            }
            
            // Input handling
            if (this.input) {
                // Keyboard controls
                this.input.on('keydown', (key) => this.handleKeyDown(key));
                this.input.on('keyup', (key) => this.handleKeyUp(key));
                
                // Mouse/touch controls
                this.input.on('pointerdown', (position) => this.handlePointerDown(position));
                this.input.on('pointermove', (position) => this.handlePointerMove(position));
                this.input.on('pointerup', (position) => this.handlePointerUp(position));
            }
            
            // Game state change listeners
            this.onStateChange((newState, oldState) => {
                console.log(`[DEBUG] Game state changed: ${oldState} -> ${newState}`);
                
                // Update UI based on state changes
                if (this.ui) {
                    switch (newState) {
                        case 'menu':
                            this.ui.showScreen('menu');
                            break;
                        case 'playing':
                            this.ui.showScreen('game');
                            break;
                        case 'paused':
                            this.ui.showMessage('Game Paused', 'The game is paused', 'Resume', () => this.resumeGame());
                            break;
                        case 'gameOver':
                            this.ui.showScreen('gameOver');
                            break;
                    }
                }
            });
            
            console.log('[DEBUG] Game event listeners set up successfully');
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            throw error;
        }
    }

    /**
     * Handles key down events
     * @param {string} key - The key that was pressed
     */
    handleKeyDown(key) {
        try {
            if (!this.currentPlayer || this.getState() !== 'playing') return;
            
            // Handle player movement
            switch (key) {
                case 'ArrowLeft':
                    this.currentPlayer.move('left');
                    break;
                case 'ArrowRight':
                    this.currentPlayer.move('right');
                    break;
                case ' ':
                    this.currentPlayer.startCharging();
                    break;
                case 'Escape':
                    this.togglePause();
                    break;
            }
        } catch (error) {
            console.error('Error handling keydown:', error);
            this.showError('Error processing input');
        }
    }
    
    /**
     * Handles key up events
     * @param {string} key - The key that was released
     */
    handleKeyUp(key) {
        try {
            if (!this.currentPlayer || this.getState() !== 'playing') return;
            
            // Handle key releases
            switch (key) {
                case ' ':
                    const power = this.currentPlayer.stopCharging();
                    if (power > 0) {
                        this.currentPlayer.shoot(power, this.currentPlayer.angle);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling keyup:', error);
            this.showError('Error processing input');
        }
    }
    
    /**
     * Handles pointer down events (mouse/touch)
     * @param {Object} position - The pointer position {x, y}
     */
    handlePointerDown(position) {
        try {
            if (this.getState() !== 'playing' || !this.currentPlayer) return;
            this.currentPlayer.startCharging();
        } catch (error) {
            console.error('Error handling pointer down:', error);
            this.showError('Error processing input');
        }
    }
    
    /**
     * Handles pointer move events (mouse/touch)
     * @param {Object} position - The pointer position {x, y}
     */
    handlePointerMove(position) {
        try {
            if (this.getState() !== 'playing' || !this.currentPlayer) return;
            
            // Calculate angle based on pointer position
            // This is a simplified version - you might want to adjust based on your game's coordinate system
            const angle = Math.atan2(
                position.y - this.currentPlayer.position.y,
                position.x - this.currentPlayer.position.x
            );
            
            this.currentPlayer.rotate(angle);
        } catch (error) {
            console.error('Error handling pointer move:', error);
        }
    }
    
    /**
     * Handles pointer up events (mouse/touch)
     * @param {Object} position - The pointer position {x, y}
     */
    handlePointerUp(position) {
        try {
            if (this.getState() !== 'playing' || !this.currentPlayer) return;
            
            const power = this.currentPlayer.stopCharging();
            if (power > 0) {
                const angle = Math.atan2(
                    position.y - this.currentPlayer.position.y,
                    position.x - this.currentPlayer.position.x
                );
                this.currentPlayer.shoot(power, angle);
            }
        } catch (error) {
            console.error('Error handling pointer up:', error);
            this.showError('Error processing input');
        }
    }
    
    /**
     * Displays an error message to the user
     * @param {string} message - The error message to display
     */
    showError(message) {
        console.error('Game Error:', message);
        
        // If UI is available, show the error in the UI
        if (this.ui && typeof this.ui.showError === 'function') {
            this.ui.showError(message);
        } 
        // Fallback to alert if UI is not available
        else {
            alert('Error: ' + message);
        }
    }

    /**
     * Starts a new game
     */
    startGame() {
        try {
            console.log('[DEBUG] Starting new game');
            
            // Reset game state
            this.scores = [0, 0];
            this.round = 1;
            this.currentPlayerIndex = 0;
            
            // Reset players
            if (this.players.length > 0) {
                this.players.forEach(player => {
                    if (player && typeof player.reset === 'function') {
                        player.reset();
                    }
                });
            }
            
            // Reset board
            if (this.board && typeof this.board.reset === 'function') {
                this.board.reset();
            }
            
            // Update game state
            this.setState('playing');
            
            // Show game screen
            if (this.ui) {
                this.ui.showScreen('game');
                this.ui.updateScores(this.scores[0], this.scores[1]);
                this.ui.updateTurnIndicator(this.currentPlayerIndex + 1);
            }
            
            // Start the first turn
            this.startTurn();
            
            console.log('[DEBUG] New game started');
        } catch (error) {
            console.error('Error starting game:', error);
            this.showError('Failed to start game');
            this.showMainMenu(); // Fall back to main menu on error
        }
    }
    
    /**
     * Toggles the pause state of the game
     */
    togglePause() {
        if (this.getState() === 'playing') {
            this.pauseGame();
        } else if (this.getState() === 'paused') {
            this.resumeGame();
        }
    }
    
    /**
     * Pauses the game
     */
    pauseGame() {
        if (this.getState() === 'playing') {
            console.log('[DEBUG] Pausing game');
            this.setState('paused');
            this.isPaused = true;
            
            // Show pause menu
            if (this.ui) {
                this.ui.showMessage(
                    'Game Paused',
                    'The game is currently paused',
                    'Resume',
                    () => this.resumeGame()
                );
            }
        }
    }
    
    /**
     * Resumes a paused game
     */
    resumeGame() {
        if (this.getState() === 'paused') {
            console.log('[DEBUG] Resuming game');
            this.setState('playing');
            this.isPaused = false;
            
            // Hide any pause-related UI
            if (this.ui) {
                this.ui.hideMessage();
            }
            
            // Restart the animation loop if it's not running
            if (!this.animationFrameId) {
                this.animate();
            }
        }
    }
    
    /**
     * Returns to the main menu from the game
     */
    returnToMainMenu() {
        console.log('[DEBUG] Returning to main menu');
        
        // Confirm with the user if they're in the middle of a game
        if (this.getState() === 'playing' || this.getState() === 'paused') {
            this.ui.showConfirmation(
                'Return to Main Menu',
                'Are you sure you want to return to the main menu? Your current game progress will be lost.',
                'Quit',
                'Cancel',
                () => {
                    // On confirm
                    this.showMainMenu();
                },
                () => {
                    // On cancel - resume game if it was paused
                    if (this.getState() === 'paused') {
                        this.resumeGame();
                    }
                }
            );
        } else {
            this.showMainMenu();
        }
    }
    
    /**
     * Restarts the current game
     */
    restartGame() {
        console.log('[DEBUG] Restarting game');
        
        // Confirm with the user if they're in the middle of a game
        if (this.getState() === 'playing' || this.getState() === 'paused') {
            this.ui.showConfirmation(
                'Restart Game',
                'Are you sure you want to restart the game? Your current progress will be lost.',
                'Restart',
                'Cancel',
                () => {
                    // On confirm
                    this.startGame();
                },
                () => {
                    // On cancel - resume game if it was paused
                    if (this.getState() === 'paused') {
                        this.resumeGame();
                    }
                }
            );
        } else {
            this.startGame();
        }
    }
    
    /**
     * Applies audio settings to the game
     */
    applyAudioSettings() {
        console.log('[DEBUG] Applying audio settings');
        
        // Apply master volume
        if (this.audioListener && typeof this.audioListener.setMasterVolume === 'function') {
            this.audioListener.setMasterVolume(this.settings.audio.masterVolume);
        }
        
        // Apply music volume if music is playing
        if (this.backgroundMusic && typeof this.backgroundMusic.setVolume === 'function') {
            this.backgroundMusic.setVolume(this.settings.audio.musicVolume * this.settings.audio.masterVolume);
        }
        
        // Save settings
        this.saveSettings();
    }
    
    /**
     * Applies graphics settings to the game
     */
    applyGraphicsSettings() {
        console.log('[DEBUG] Applying graphics settings');
        
        if (!this.renderer) return;
        
        // Apply quality settings
        switch (this.settings.graphics.quality) {
            case 'low':
                this.renderer.shadowMap.enabled = false;
                this.renderer.antialias = false;
                if (this.sunLight) this.sunLight.castShadow = false;
                break;
                
            case 'high':
                this.renderer.shadowMap.enabled = true;
                this.renderer.antialias = true;
                if (this.sunLight) this.sunLight.castShadow = true;
                // Enable higher quality shadows
                if (this.sunLight?.shadow) {
                    this.sunLight.shadow.mapSize.width = 4096;
                    this.sunLight.shadow.mapSize.height = 4096;
                }
                break;
                
            case 'medium':
            default:
                this.renderer.shadowMap.enabled = true;
                this.renderer.antialias = true;
                if (this.sunLight) this.sunLight.castShadow = true;
                // Medium quality shadows
                if (this.sunLight?.shadow) {
                    this.sunLight.shadow.mapSize.width = 2048;
                    this.sunLight.shadow.mapSize.height = 2048;
                }
        }
        
        // Apply pixel ratio
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Save settings
        this.saveSettings();
    }
    
    /**
     * Checks if the game is over based on current scores
     * @returns {boolean} True if the game is over, false otherwise
     */
    checkGameOver() {
        try {
            // Check if either player has reached the winning score
            const player1Wins = this.scores[0] >= this.winningScore;
            const player2Wins = this.scores[1] >= this.winningScore;
            
            if (player1Wins || player2Wins) {
                const winner = player1Wins ? 1 : 2;
                this.endGame(winner);
                return true;
            }
            
            // Check if all discs have been played
            const allDiscsPlayed = this.players.every(player => !player.hasDiscsLeft());
            if (allDiscsPlayed) {
                // Game ends, determine winner by highest score
                const winner = this.scores[0] > this.scores[1] ? 1 : 
                              this.scores[1] > this.scores[0] ? 2 : 0; // 0 means tie
                
                this.endGame(winner);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking game over condition:', error);
            return false;
        }
    }
    
    /**
     * Handles the end of the game
     * @param {number} winner - The player number who won (0 for tie)
     */
    endGame(winner) {
        try {
            // Set game state to game over
            this.setState('gameOver');
            
            // Show game over screen with results
            if (this.ui) {
                let title, message;
                
                if (winner === 0) {
                    title = "It's a Tie!";
                    message = `Both players scored ${this.scores[0]} points!`;
                } else {
                    const isAI = this.players[winner - 1]?.isAI;
                    title = isAI ? "Game Over" : `Player ${winner} Wins!`;
                    message = `Final Score - Player 1: ${this.scores[0]} | ${isAI ? 'AI' : 'Player 2'}: ${this.scores[1]}`;
                }
                
                this.ui.showGameOver(title, message);
            }
            
            // Save high score if applicable
            this.saveHighScore();
            
        } catch (error) {
            console.error('Error ending game:', error);
        }
    }
    
    /**
     * Saves the high score if it's a new record
     */
    saveHighScore() {
        try {
            const highScores = JSON.parse(localStorage.getItem('shuffleboardHighScores') || '[]');
            const currentScore = Math.max(...this.scores);
            
            // Only save if it's a new high score
            if (highScores.length < 10 || currentScore > Math.min(...highScores)) {
                highScores.push({
                    score: currentScore,
                    date: new Date().toISOString(),
                    winner: this.scores[0] > this.scores[1] ? 'Player 1' : 
                           this.scores[1] > this.scores[0] ? 'AI' : 'Tie'
                });
                
                // Sort in descending order and keep top 10
                highScores.sort((a, b) => b.score - a.score);
                if (highScores.length > 10) {
                    highScores.length = 10;
                }
                
                localStorage.setItem('shuffleboardHighScores', JSON.stringify(highScores));
            }
        } catch (error) {
            console.error('Error saving high score:', error);
        }
    }
    
    /**
     * Saves current settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('shuffleboardSettings', JSON.stringify(this.settings));
            console.log('[DEBUG] Settings saved');
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
}

export { ShuffleboardGame, initGame };

function initGame() {
    console.log('[DEBUG] Initializing game...');
    const game = new ShuffleboardGame();
    window.game = game; // Make it accessible in the console for debugging
    
    // Hide loading overlay when the game is ready
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    return game;
}
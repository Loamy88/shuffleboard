// Game constants
const BOARD_LENGTH = 20;
const BOARD_WIDTH = 2;
const DISC_RADIUS = 0.15;
const DISC_HEIGHT = 0.1;
const PLAYER_HEIGHT = 1.7;
const SHOT_POWER = 15;
const MAX_ANGLE = Math.PI / 4;
const SCORING_ZONES = [
    { min: 18, max: 20, points: 10 },
    { min: 15, max: 18, points: 8 },
    { min: 10, max: 15, points: 7 },
    { min: 0, max: 10, points: -10 }
];

// Game state
let scene, camera, renderer, world;
let board, player, discs = [], activeDisc = null;
let player1Score = 0, player2Score = 0, currentRound = 1;
let currentPlayer = 1; // 1 or 2
let discsShot = 0;
let gameState = 'aiming'; // 'aiming', 'charging', 'shooting', 'scoring', 'gameOver'
let power = 0;
let powerIncreasing = true;
let clock = new THREE.Clock();
let physicsWorld;
let scoreboard;
let messageTimeout;

// Initialize the game
function init() {
    // Set up Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // Set up camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, -3);
    camera.lookAt(0, 1.7, 0);
    
    // Set up renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Set up physics
    initPhysics();
    
    // Add lights
    addLights();
    
    // Create game objects
    createBoard();
    createPlayer();
    createDiscs();
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Start game loop
    animate();
    
    // Show initial message
    showMessage(`Player ${currentPlayer}'s turn`);
}

function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    
    // Create ground plane
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

function addLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
}

function createBoard() {
    // Board base
    const boardGeometry = new THREE.BoxGeometry(BOARD_WIDTH, 0.1, BOARD_LENGTH);
    const boardMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.8,
        metalness: 0.2
    });
    board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.receiveShadow = true;
    board.position.y = 0.05;
    scene.add(board);
    
    // Add physics body for the board
    const boardShape = new CANNON.Box(new CANNON.Vec3(BOARD_WIDTH/2, 0.05, BOARD_LENGTH/2));
    const boardBody = new CANNON.Body({ mass: 0 });
    boardBody.addShape(boardShape);
    boardBody.position.y = 0.05;
    world.addBody(boardBody);
    
    // Add scoring zones
    const zoneGeometry = new THREE.PlaneGeometry(BOARD_WIDTH, 0.1);
    const zoneMaterials = [
        new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 }), // -10
        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 }), // 7
        new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.3 }), // 8
        new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3 })  // 10
    ];
    
    SCORING_ZONES.forEach((zone, i) => {
        const zoneMesh = new THREE.Mesh(
            zoneGeometry,
            zoneMaterials[i]
        );
        zoneMesh.rotation.x = -Math.PI / 2;
        zoneMesh.position.set(0, 0.06, (zone.min + zone.max) / 2);
        zoneMesh.scale.z = zone.max - zone.min;
        scene.add(zoneMesh);
    });
}

function createPlayer() {
    // Create a simple stick representation
    const stickGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
    const stickMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const stick = new THREE.Mesh(stickGeometry, stickMaterial);
    stick.position.set(0, 0.5, -2);
    stick.rotation.x = Math.PI / 2;
    scene.add(stick);
    
    // Player object to track state
    player = {
        position: new THREE.Vector3(0, 0, -2),
        angle: 0,
        power: 0,
        mesh: stick
    };
}

function createDiscs() {
    // Clear existing discs
    discs.forEach(disc => {
        scene.remove(disc.mesh);
        world.removeBody(disc.body);
    });
    discs = [];
    
    // Create new discs
    for (let i = 0; i < 4; i++) {
        createDisc(1, i); // Player 1 discs (red)
        createDisc(2, i); // Player 2 discs (blue)
    }
}

function createDisc(playerNum, index) {
    const color = playerNum === 1 ? 0xff0000 : 0x0000ff;
    const geometry = new THREE.CylinderGeometry(DISC_RADIUS, DISC_RADIUS, DISC_HEIGHT, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.2,
        metalness: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Position discs at the starting area
    const x = (index - 1.5) * 0.4;
    const z = -1.5 + (playerNum - 1) * 0.1; // Slight offset for player 2
    mesh.position.set(x, DISC_HEIGHT / 2, z);
    
    // Create physics body
    const shape = new CANNON.Cylinder(DISC_RADIUS, DISC_RADIUS, DISC_HEIGHT, 16);
    const body = new CANNON.Body({
        mass: 1,
        shape: shape,
        position: new CANNON.Vec3(x, DISC_HEIGHT / 2, z),
        linearDamping: 0.1,
        angularDamping: 0.3
    });
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    
    // Store disc data
    const disc = {
        mesh,
        body,
        player: playerNum,
        scored: false,
        points: 0
    };
    
    discs.push(disc);
    scene.add(mesh);
    world.addBody(body);
    
    return disc;
}

function getActivePlayerDiscs() {
    return discs.filter(disc => disc.player === currentPlayer && !disc.scored);
}

function updatePlayerPosition(delta) {
    const speed = 3 * delta;
    const moveDistance = 2 * delta;
    
    // Handle keyboard input
    if (keys.ArrowLeft || keys.a) player.position.x = Math.max(-BOARD_WIDTH/2 + 0.5, player.position.x - moveDistance);
    if (keys.ArrowRight || keys.d) player.position.x = Math.min(BOARD_WIDTH/2 - 0.5, player.position.x + moveDistance);
    if (keys.ArrowUp || keys.w) player.angle = Math.min(MAX_ANGLE, player.angle + speed);
    if (keys.ArrowDown || keys.s) player.angle = Math.max(-MAX_ANGLE, player.angle - speed);
    
    // Update player stick position and rotation
    player.mesh.position.x = player.position.x;
    player.mesh.rotation.z = player.angle;
}

function updatePowerMeter() {
    const powerMeter = document.getElementById('power-meter');
    const powerFill = document.getElementById('power-fill');
    
    if (gameState === 'charging') {
        powerMeter.style.display = 'block';
        powerFill.style.width = `${power * 100}%`;
    } else {
        powerMeter.style.display = 'none';
    }
}

function shootDisc() {
    const activeDiscs = getActivePlayerDiscs();
    if (activeDiscs.length === 0) return;
    
    activeDisc = activeDiscs[0];
    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0), 
        player.angle
    );
    
    const power = this.power * SHOT_POWER;
    activeDisc.body.velocity.set(
        direction.x * power,
        0,
        direction.z * power
    );
    
    // Add slight randomness
    activeDisc.body.velocity.x += (Math.random() - 0.5) * 0.5;
    activeDisc.body.velocity.z += (Math.random() - 0.5) * 0.5;
    
    gameState = 'shooting';
    discsShot++;
    
    // Check if all discs have been shot
    if (discsShot >= 8) {
        setTimeout(() => {
            calculateScores();
        }, 2000);
    } else if (discsShot % 2 === 0) {
        // Switch player after each pair of shots
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        showMessage(`Player ${currentPlayer}'s turn`);
    }
}

function calculateScores() {
    // Reset scores for this round
    let roundScore1 = 0;
    let roundScore2 = 0;
    
    // Calculate scores based on final positions
    const player1Discs = discs.filter(d => d.player === 1 && !d.scored);
    const player2Discs = discs.filter(d => d.player === 2 && !d.scored);
    
    player1Discs.forEach(disc => {
        const z = disc.body.position.z;
        const points = getPointsForPosition(z);
        disc.points = points;
        roundScore1 += points;
        disc.scored = true;
    });
    
    player2Discs.forEach(disc => {
        const z = disc.body.position.z;
        const points = getPointsForPosition(z);
        disc.points = points;
        roundScore2 += points;
        disc.scored = true;
    });
    
    // Update total scores
    player1Score += roundScore1;
    player2Score += roundScore2;
    
    // Update UI
    document.getElementById('player1-score').textContent = `Player 1: ${player1Score}`;
    document.getElementById('player2-score').textContent = `Player 2: ${player2Score}`;
    
    // Check for winner
    if (player1Score >= 75 || player2Score >= 75) {
        if (player1Score === player2Score) {
            // Sudden death
            showMessage(`Tie game! Sudden death round!`);
            currentRound++;
            document.getElementById('round').textContent = `Round: ${currentRound} (Sudden Death)`;
        } else {
            const winner = player1Score > player2Score ? 1 : 2;
            showMessage(`Player ${winner} wins!`, 5000);
            gameState = 'gameOver';
            return;
        }
    } else {
        showMessage(`Round ${currentRound} scores - P1: ${roundScore1}, P2: ${roundScore2}`, 3000);
    }
    
    // Reset for next round
    currentRound++;
    document.getElementById('round').textContent = `Round: ${currentRound}`;
    
    // Reset game state
    setTimeout(() => {
        createDiscs();
        gameState = 'aiming';
        currentPlayer = 1;
        discsShot = 0;
        showMessage(`Player ${currentPlayer}'s turn`);
    }, 3000);
}

function getPointsForPosition(z) {
    for (const zone of SCORING_ZONES) {
        if (z >= zone.min && z <= zone.max) {
            return zone.points;
        }
    }
    return 0;
}

function showMessage(text, duration = 2000) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.style.display = 'block';
    
    if (messageTimeout) clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
        message.style.display = 'none';
    }, duration);
}

// Input handling
const keys = {};

function onKeyDown(event) {
    keys[event.key] = true;
    
    if ((event.key === ' ' || event.key === 'Spacebar') && gameState === 'aiming') {
        gameState = 'charging';
        power = 0;
        powerIncreasing = true;
    }
}

function onKeyUp(event) {
    keys[event.key] = false;
    
    if ((event.key === ' ' || event.key === 'Spacebar') && gameState === 'charging') {
        gameState = 'aiming';
        shootDisc();
    }
}

// Game loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(0.1, clock.getDelta());
    
    // Update physics
    world.step(1/60, delta, 3);
    
    // Update disc positions
    discs.forEach(disc => {
        if (disc.body) {
            disc.mesh.position.copy(disc.body.position);
            disc.mesh.quaternion.copy(disc.body.quaternion);
            
            // Remove discs that go too far
            if (Math.abs(disc.body.position.x) > BOARD_WIDTH * 2 || 
                disc.body.position.z > BOARD_LENGTH * 1.5 ||
                disc.body.position.z < -BOARD_LENGTH * 1.5) {
                scene.remove(disc.mesh);
                world.removeBody(disc.body);
                disc.body = null;
            }
        }
    });
    
    // Update game state
    if (gameState === 'aiming') {
        updatePlayerPosition(delta);
    } else if (gameState === 'charging') {
        // Update power meter
        if (powerIncreasing) {
            power += delta * 0.5;
            if (power >= 1) {
                power = 1;
                powerIncreasing = false;
            }
        } else {
            power -= delta * 0.5;
            if (power <= 0) {
                power = 0;
                powerIncreasing = true;
            }
        }
        updatePowerMeter();
    } else if (gameState === 'shooting') {
        // Check if disc has stopped moving
        if (activeDisc && activeDisc.body) {
            const velocity = activeDisc.body.velocity;
            const angularVelocity = activeDisc.body.angularVelocity;
            const isMoving = velocity.length() > 0.1 || angularVelocity.length() > 0.1;
            
            if (!isMoving) {
                gameState = 'aiming';
                activeDisc = null;
            }
        }
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start the game
init();

// Utility functions for the game

// Generate a random number between min and max
function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Convert degrees to radians
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Convert radians to degrees
function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

// Calculate distance between two 3D points
function distance3D(x1, y1, z1, x2, y2, z2) {
    return Math.sqrt(
        Math.pow(x2 - x1, 2) + 
        Math.pow(y2 - y1, 2) + 
        Math.pow(z2 - z1, 2)
    );
}

// Create a simple material with color and optional opacity
function createMaterial(color, opacity = 1) {
    return new THREE.MeshPhongMaterial({
        color: color,
        shininess: 30,
        transparent: opacity < 1,
        opacity: opacity
    });
}

// Create a simple geometry with material
function createBox(width, height, depth, color, x = 0, y = 0, z = 0) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = createMaterial(color);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    return mesh;
}

// Create a cylinder
function createCylinder(radiusTop, radiusBottom, height, color, x = 0, y = 0, z = 0) {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32);
    const material = createMaterial(color);
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(x, y, z);
    return cylinder;
}

// Create a sphere
function createSphere(radius, color, x = 0, y = 0, z = 0) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = createMaterial(color);
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, z);
    return sphere;
}

// Create a plane
function createPlane(width, height, color, x = 0, y = 0, z = 0, rotationX = 0, rotationZ = 0) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = createMaterial(color);
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = rotationX;
    plane.rotation.z = rotationZ;
    plane.position.set(x, y, z);
    return plane;
}

// Add subtle noise to a value
function addNoise(value, intensity = 0.01) {
    return value * (1 + (Math.random() * 2 - 1) * intensity);
}

// Calculate the score based on position on the board
function calculateScore(x, z, boardLength) {
    // Normalize position to 0-1 range
    const normalizedPos = (x + boardLength / 2) / boardLength;
    
    // Define scoring zones (from back to front)
    if (normalizedPos < 0.1) return -10;  // -10 zone
    if (normalizedPos < 0.3) return 7;    // 7 zone
    if (normalizedPos < 0.6) return 8;    // 8 zone
    if (normalizedPos < 0.9) return 10;   // 10 zone
    return 0;  // No score if beyond the board
}

// Export for use in other modules
export {
    randomInRange,
    clamp,
    degToRad,
    radToDeg,
    distance3D,
    createMaterial,
    createBox,
    createCylinder,
    createSphere,
    createPlane,
    addNoise,
    calculateScore
};

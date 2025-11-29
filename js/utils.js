// Utility functions
const Utils = {
    // Generate a random number between min and max
    random: (min, max) => Math.random() * (max - min) + min,

    // Clamp a value between min and max
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),

    // Linear interpolation
    lerp: (a, b, t) => (1 - t) * a + t * b,

    // Convert degrees to radians
    toRad: (degrees) => degrees * (Math.PI / 180),

    // Convert radians to degrees
    toDeg: (radians) => radians * (180 / Math.PI),

    // Calculate distance between two 3D points
    distance: (x1, y1, z1, x2, y2, z2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    // Create a THREE.js material with common settings
    createMaterial: (color, options = {}) => {
        const defaults = {
            color: color,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        };
        return new THREE.MeshStandardMaterial({ ...defaults, ...options });
    }
};

// Export the utils object
export default Utils;

import * as THREE from 'three';
// Utility functions for the game

// Generate a random number between min and max
export function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Clamp a value between min and max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Convert degrees to radians
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Convert radians to degrees
export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

// Linear interpolation
export function lerp(a, b, t) {
    return (1 - t) * a + t * b;
}

// Calculate distance between two 3D points
export function distance3D(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Create a THREE.js material with common settings
export function createMaterial(color, options = {}) {
    const defaults = {
        color: color,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide
    };
    return new THREE.MeshStandardMaterial({ ...defaults, ...options });
}


import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import * as CANNON from 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
import { createMaterial, createBox, createPlane, degToRad } from './utils.js';

class Board {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.length = 30;  // Length of the board (z-axis)
        this.width = 2;    // Width of the board (x-axis)
        this.thickness = 0.2; // Thickness of the board
        this.friction = 0.2; // Friction coefficient
        
        // Create the board
        this.createBoard();
        this.createScoringZones();
        this.createBorders();
        this.setupPhysics();
    }
    
    createBoard() {
        // Main board surface
        const boardGeometry = new THREE.BoxGeometry(this.width, this.thickness, this.length);
        const boardMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513, // Wooden brown
            shininess: 20,
            side: THREE.DoubleSide
        });
        
        this.boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
        this.boardMesh.position.y = -this.thickness / 2;
        this.boardMesh.receiveShadow = true;
        this.scene.add(this.boardMesh);
        
        // Add wood grain texture
        this.addWoodGrain();
    }
    
    addWoodGrain() {
        // Create a wood grain effect using a texture or shader
        // For now, we'll use a simple striped texture
        const grainCount = 50;
        const grainWidth = 0.05;
        
        for (let i = 0; i < grainCount; i++) {
            const grain = new THREE.Mesh(
                new THREE.BoxGeometry(grainWidth, this.thickness * 1.1, this.length * 1.1),
                new THREE.MeshPhongMaterial({
                    color: 0x7D3F1A,
                    shininess: 10
                })
            );
            
            const xPos = (Math.random() - 0.5) * this.width * 0.9;
            grain.position.set(xPos, 0, 0);
            this.boardMesh.add(grain);
        }
    }
    
    createScoringZones() {
        // Create scoring zones at the end of the board
        const zoneLength = this.length / 4;
        const zoneWidth = this.width;
        const zoneThickness = 0.1;
        
        // -10 zone (closest to player)
        const zoneMinus10 = createBox(
            zoneWidth, 
            zoneThickness, 
            zoneLength, 
            0xff0000, // Red
            0, 
            zoneThickness / 2, 
            -this.length / 2 + zoneLength / 2
        );
        zoneMinus10.material.transparent = true;
        zoneMinus10.material.opacity = 0.3;
        this.scene.add(zoneMinus10);
        
        // 7 zone
        const zone7 = createBox(
            zoneWidth, 
            zoneThickness, 
            zoneLength, 
            0xffff00, // Yellow
            0, 
            zoneThickness / 2, 
            -this.length / 2 + zoneLength * 1.5
        );
        zone7.material.transparent = true;
        zone7.material.opacity = 0.3;
        this.scene.add(zone7);
        
        // 8 zone
        const zone8 = createBox(
            zoneWidth, 
            zoneThickness, 
            zoneLength, 
            0x00ff00, // Green
            0, 
            zoneThickness / 2, 
            -this.length / 2 + zoneLength * 2.5
        );
        zone8.material.transparent = true;
        zone8.material.opacity = 0.3;
        this.scene.add(zone8);
        
        // 10 zone (furthest from player)
        const zone10 = createBox(
            zoneWidth, 
            zoneThickness, 
            zoneLength / 2, 
            0x0000ff, // Blue
            0, 
            zoneThickness / 2, 
            -this.length / 2 + zoneLength * 3.75
        );
        zone10.material.transparent = true;
        zone10.material.opacity = 0.3;
        this.scene.add(zone10);
        
        // Add text labels for scoring zones
        this.addZoneLabels();
    }
    
    addZoneLabels() {
        const loader = new THREE.TextureLoader();
        const createLabel = (text, x, z, size = 0.5) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 128;
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = 'Bold 80px Arial';
            context.textAlign = 'center';
            context.fillStyle = 'white';
            context.fillText(text, canvas.width / 2, canvas.height / 1.5);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide
            });
            
            const geometry = new THREE.PlaneGeometry(size, size / 2);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, 0.2, z);
            mesh.rotation.x = -Math.PI / 2;
            this.scene.add(mesh);
        };
        
        // Add score labels
        createLabel('-10', 0, -this.length / 2 + 2, 0.8);
        createLabel('7', 0, -this.length / 2 + 6, 0.8);
        createLabel('8', 0, -this.length / 2 + 10, 0.8);
        createLabel('10', 0, -this.length / 2 + 13.5, 0.8);
    }
    
    createBorders() {
        const borderHeight = 0.5;
        const borderThickness = 0.2;
        
        // Left border
        const leftBorder = createBox(
            borderThickness,
            borderHeight,
            this.length,
            0x8B4513,
            -this.width / 2 - borderThickness / 2,
            borderHeight / 2,
            0
        );
        leftBorder.castShadow = true;
        this.scene.add(leftBorder);
        
        // Right border
        const rightBorder = createBox(
            borderThickness,
            borderHeight,
            this.length,
            0x8B4513,
            this.width / 2 + borderThickness / 2,
            borderHeight / 2,
            0
        );
        rightBorder.castShadow = true;
        this.scene.add(rightBorder);
        
        // Far border (behind scoring zones)
        const farBorder = createBox(
            this.width + borderThickness * 2,
            borderHeight,
            borderThickness,
            0x8B4513,
            0,
            borderHeight / 2,
            this.length / 2 + borderThickness / 2
        );
        farBorder.castShadow = true;
        this.scene.add(farBorder);
    }
    
    setupPhysics() {
        // Create physics body for the board
        const boardShape = new CANNON.Box(new CANNON.Vec3(
            this.width / 2,
            this.thickness / 2,
            this.length / 2
        ));
        
        this.boardBody = new CANNON.Body({
            mass: 0, // Static body
            shape: boardShape,
            position: new CANNON.Vec3(0, -this.thickness / 2, 0),
            material: new CANNON.Material('boardMaterial')
        });
        
        // Set up friction
        this.boardMaterial = new CANNON.Material('boardMaterial');
        const boardContactMaterial = new CANNON.ContactMaterial(
            this.boardMaterial,
            this.world.defaultContactMaterial.material,
            {
                friction: this.friction,
                restitution: 0.2
            }
        );
        
        this.world.addContactMaterial(boardContactMaterial);
        this.world.addBody(this.boardBody);
        
        // Add borders to physics
        this.addPhysicsBorders();
    }
    
    addPhysicsBorders() {
        const borderHeight = 0.5;
        const borderThickness = 0.2;
        
        // Left border
        const leftBorderShape = new CANNON.Box(new CANNON.Vec3(
            borderThickness / 2,
            borderHeight / 2,
            this.length / 2
        ));
        
        const leftBorderBody = new CANNON.Body({
            mass: 0,
            shape: leftBorderShape,
            position: new CANNON.Vec3(
                -this.width / 2 - borderThickness / 2,
                borderHeight / 2,
                0
            )
        });
        
        // Right border
        const rightBorderBody = new CANNON.Body({
            mass: 0,
            shape: leftBorderShape,
            position: new CANNON.Vec3(
                this.width / 2 + borderThickness / 2,
                borderHeight / 2,
                0
            )
        });
        
        // Far border
        const farBorderShape = new CANNON.Box(new CANNON.Vec3(
            this.width / 2 + borderThickness,
            borderHeight / 2,
            borderThickness / 2
        ));
        
        const farBorderBody = new CANNON.Body({
            mass: 0,
            shape: farBorderShape,
            position: new CANNON.Vec3(
                0,
                borderHeight / 2,
                this.length / 2 + borderThickness / 2
            )
        });
        
        this.world.addBody(leftBorderBody);
        this.world.addBody(rightBorderBody);
        this.world.addBody(farBorderBody);
    }
    
    // Check if a position is within the board bounds
    isInBounds(x, z) {
        const halfWidth = this.width / 2;
        return (
            x >= -halfWidth && 
            x <= halfWidth && 
            z >= -this.length / 2 && 
            z <= this.length / 2
        );
    }
    
    // Calculate score based on disc position
    calculateScore(z) {
        const normalizedZ = (z + this.length / 2) / this.length;
        
        if (normalizedZ < 0.1) return -10;  // -10 zone
        if (normalizedZ < 0.35) return 7;    // 7 zone
        if (normalizedZ < 0.65) return 8;    // 8 zone
        if (normalizedZ < 0.9) return 10;    // 10 zone
        return 0;  // No score if beyond the board
    }
}

export default Board;

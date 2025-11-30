import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createMaterial } from './utils.js';

class Board {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.length = 20;
        this.width = 2;
        this.height = 0.1;
        this.scoringZones = [
            { min: 18, max: 20, points: 10, color: 0xffff00 },
            { min: 15, max: 18, points: 8, color: 0x0000ff },
            { min: 10, max: 15, points: 7, color: 0x00ff00 },
            { min: 0, max: 10, points: -10, color: 0xff0000 }
        ];

        this.createBoard();
        this.createScoringZones();
    }

    createBoard() {
        // Visual board - Use a simpler material for better performance
        const geometry = new THREE.BoxGeometry(
            this.width, 
            this.height, 
            this.length
        );
        
        // Create a simple green material for the board
        const material = new THREE.MeshStandardMaterial({
            color: 0x2e7d32, // Darker green for the board
            roughness: 0.7,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = this.height / 2;
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // Physics board - make it slightly larger to prevent discs from falling through edges
        const physicsShape = new CANNON.Box(new CANNON.Vec3(
            this.width / 2 * 1.01,  // Slightly larger to prevent edge issues
            this.height / 2,
            this.length / 2 * 1.01  // Slightly larger to prevent edge issues
        ));
        
        this.body = new CANNON.Body({
            mass: 0,  // Static body
            shape: physicsShape,
            material: new CANNON.Material('boardMaterial')
        });
        
        // Add some friction to the board
        this.body.material.friction = 0.3;
        this.body.material.restitution = 0.2;
        
        this.world.addBody(this.body);
    }

    createScoringZones() {
        // Add triangle at the end of the board
        const triangleShape = new THREE.Shape();
        const triangleSize = this.width * 0.8;
        const triangleDepth = 2;
        
        triangleShape.moveTo(0, 0);
        triangleShape.lineTo(-triangleSize/2, triangleDepth);
        triangleShape.lineTo(triangleSize/2, triangleDepth);
        triangleShape.lineTo(0, 0);
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.1,
            bevelEnabled: false
        };
        
        const triangleGeometry = new THREE.ExtrudeGeometry(triangleShape, extrudeSettings);
        const triangleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        
        this.triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
        this.triangle.rotation.x = -Math.PI / 2;
        this.triangle.position.set(0, this.height + 0.05, this.length/2 - 0.1);
        this.scene.add(this.triangle);

        // Scoring zones
        const zoneWidth = this.width * 0.8;
        const zoneHeight = 0.05;
        const zoneDepth = 0.1;
        
        // Define scoring zones with their positions and points
        const zones = [
            { position: 0, width: zoneWidth * 0.3, points: 10, color: 0xffffff, outline: true },     // White - 10 points
            { position: zoneWidth * 0.2, width: zoneWidth * 0.15, points: 8, color: 0xffffff, outline: true },  // White - 8 points
            { position: -zoneWidth * 0.2, width: zoneWidth * 0.15, points: 8, color: 0xffffff, outline: true }, // White - 8 points
            { position: zoneWidth * 0.4, width: zoneWidth * 0.2, points: 7, color: 0xffffff, outline: true },   // White - 7 points
            { position: -zoneWidth * 0.4, width: zoneWidth * 0.2, points: 7, color: 0xffffff, outline: true },  // White - 7 points
            { position: zoneWidth * 0.65, width: zoneWidth * 0.1, points: -10, color: 0xffffff, outline: true }, // White - -10 points
            { position: -zoneWidth * 0.65, width: zoneWidth * 0.1, points: -10, color: 0xffffff, outline: true } // White - -10 points
        ];

        // Create a group to hold all scoring zone elements
        this.scoringZoneGroup = new THREE.Group();
        this.scene.add(this.scoringZoneGroup);

        zones.forEach(zone => {
            // Create the main zone
            const geometry = new THREE.BoxGeometry(zone.width - 0.02, zoneHeight, zoneDepth - 0.02);
            const material = new THREE.MeshStandardMaterial({
                color: zone.color,
                roughness: 0.5,
                metalness: 0.2
            });
            
            const zoneMesh = new THREE.Mesh(geometry, material);
            zoneMesh.position.set(
                zone.position,
                this.height + 0.05,
                this.length/2 - zoneDepth/2
            );
            zoneMesh.userData = { points: zone.points };
            this.scoringZoneGroup.add(zoneMesh);
            this.scoringZones.push(zoneMesh);

            // Add outline if needed
            if (zone.outline) {
                const outlineGeometry = new THREE.BoxGeometry(zone.width, zoneHeight + 0.01, zoneDepth);
                const outlineMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x000000,
                    side: THREE.BackSide
                });
                const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
                outline.position.set(zone.position, this.height + 0.05, this.length/2 - zoneDepth/2);
                this.scoringZoneGroup.add(outline);
            }

            // Add text for points
            if (Math.abs(zone.points) !== 7) { // Skip 7 as it's on the side zones
                this.createScoreText(zone.position, zone.points);
            }
        });
    }

    createScoreText(x, points) {
        // Create a canvas for the text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        
        // Draw the text
        context.font = 'Bold 120px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#ffffff';
        context.fillText(points.toString(), size/2, size/2);
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create a plane for the text
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.set(
            x,
            this.height + 0.06,
            this.length/2 - 0.1
        );
        textMesh.rotation.x = -Math.PI / 2;
        this.scoringZoneGroup.add(textMesh);
    }
    
    getPointsForPosition(z) {
        for (const zone of this.scoringZones) {
            if (z >= zone.min && z <= zone.max) {
                return zone.points;
            }
        }
        return 0;
    }
}

export default Board;





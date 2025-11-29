import * as THREE from 'three';
import * as CANNON from 'cannon';
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
        // Visual board
        const geometry = new THREE.BoxGeometry(
            this.width, 
            this.height, 
            this.length
        );
        const material = Utils.createMaterial(0x8B4513, {
            roughness: 0.8,
            metalness: 0.2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = this.height / 2;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        // Physics board
        const shape = new CANNON.Box(new CANNON.Vec3(
            this.width / 2,
            this.height / 2,
            this.length / 2
        ));
        this.body = new CANNON.Body({ mass: 0, shape });
        this.world.addBody(this.body);
    }

    createScoringZones() {
        this.scoringZones.forEach(zone => {
            const zoneGeometry = new THREE.PlaneGeometry(
                this.width * 0.9,
                (zone.max - zone.min) * 0.9
            );
            const zoneMaterial = new THREE.MeshBasicMaterial({
                color: zone.color,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const zoneMesh = new THREE.Mesh(zoneGeometry, zoneMaterial);
            zoneMesh.rotation.x = -Math.PI / 2;
            zoneMesh.position.set(
                0,
                this.height + 0.01,
                (zone.min + zone.max) / 2
            );
            this.scene.add(zoneMesh);
        });
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


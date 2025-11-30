import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class CameraController {
    constructor(camera, renderer, target = new THREE.Vector3(0, 0, 0)) {
        this.camera = camera;
        this.renderer = renderer;
        this.target = target;
        this.controls = null;
        this.currentMode = 'follow'; // 'follow', 'orbit', 'free'
        this.followDistance = 10;
        this.followHeight = 5;
        this.orbitControls = null;
        
        this.init();
    }

    init() {
        // Set up orbit controls
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.screenSpacePanning = false;
        this.orbitControls.minDistance = 3;
        this.orbitControls.maxDistance = 20;
        this.orbitControls.maxPolarAngle = Math.PI / 2;
        this.orbitControls.enabled = false;
        
        // Initial camera position
        this.setMode('follow');
    }

    setMode(mode) {
        this.currentMode = mode;
        
        switch(mode) {
            case 'follow':
                this.orbitControls.enabled = false;
                this.updateFollowCamera();
                break;
                
            case 'orbit':
                this.orbitControls.enabled = true;
                this.orbitControls.target.copy(this.target);
                this.orbitControls.update();
                break;
                
            case 'free':
                this.orbitControls.enabled = false;
                // Free camera would be controlled by keyboard/mouse directly
                break;
        }
    }

    updateFollowCamera() {
        if (this.currentMode !== 'follow') return;
        
        // Position camera behind and above the target
        const offset = new THREE.Vector3(0, this.followHeight, -this.followDistance);
        offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.1); // Slight downward angle
        
        const targetPosition = this.target.clone().add(offset);
        this.camera.position.lerp(targetPosition, 0.1);
        this.camera.lookAt(this.target);
    }

    setTarget(target) {
        this.target.copy(target);
    }

    update(delta) {
        if (this.currentMode === 'follow') {
            this.updateFollowCamera();
        } else if (this.currentMode === 'orbit' && this.orbitControls) {
            this.orbitControls.update();
        }
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    dispose() {
        if (this.orbitControls) {
            this.orbitControls.dispose();
        }
    }
}

export default CameraController;

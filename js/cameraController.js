import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class CameraController {
    constructor(camera, renderer, target = new THREE.Vector3(0, 0, 0)) {
        this.camera = camera;
        this.renderer = renderer;
        this.target = target.clone();
        this.controls = null;
        this.currentMode = 'follow'; // 'follow', 'orbit', 'free'
        this.followDistance = 10;
        this.followHeight = 5;
        this.orbitControls = null;
        
        // Make sure we have a valid renderer and DOM element
        if (!renderer || !renderer.domElement) {
            throw new Error('Renderer or renderer.domElement is required');
        }
        
        this.init();
    }

    init() {
        try {
            // Get the DOM element from the renderer
            const domElement = this.renderer.domElement;
            
            // Verify the DOM element is in the document
            if (!document.body.contains(domElement) && domElement !== document) {
                console.warn('Renderer.domElement is not in the document. Appending to body.');
                document.body.appendChild(domElement);
            }
            
            // Set up orbit controls with the DOM element
            this.orbitControls = new OrbitControls(this.camera, domElement);
            
            // Configure orbit controls
            this.orbitControls.enableDamping = true;
            this.orbitControls.dampingFactor = 0.05;
            this.orbitControls.screenSpacePanning = false;
            this.orbitControls.minDistance = 3;
            this.orbitControls.maxDistance = 20;
            this.orbitControls.maxPolarAngle = Math.PI / 2;
            this.orbitControls.enabled = false;
            
            // Force an initial update
            this.orbitControls.update();
        } catch (error) {
            console.error('Error initializing OrbitControls:', error);
            throw error; // Re-throw to be handled by the caller
        }
        
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

    /**
     * Resets the camera to its default position based on the current mode
     */
    resetCamera() {
        switch (this.currentMode) {
            case 'follow':
                // Position camera behind and above the target
                this.camera.position.set(
                    this.target.x,
                    this.target.y + this.followHeight,
                    this.target.z + this.followDistance
                );
                this.camera.lookAt(this.target);
                break;
                
            case 'orbit':
                // Center on target
                this.camera.position.set(0, 5, 10);
                if (this.orbitControls) {
                    this.orbitControls.target.copy(this.target);
                    this.orbitControls.update();
                }
                break;
                
            case 'free':
            default:
                // Default free camera position
                this.camera.position.set(0, 5, 10);
                this.camera.lookAt(0, 0, 0);
                break;
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

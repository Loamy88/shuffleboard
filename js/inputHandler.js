class InputHandler {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            buttons: {},
            wheelDelta: 0
        };
        
        this.touch = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isTouching: false,
            isDragging: false
        };
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse events
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        window.addEventListener('mousedown', (e) => {
            this.mouse.buttons[e.button] = true;
        });
        
        window.addEventListener('mouseup', (e) => {
            this.mouse.buttons[e.button] = false;
        });
        
        window.addEventListener('wheel', (e) => {
            this.mouse.wheelDelta = e.deltaY;
            e.preventDefault();
        }, { passive: false });
        
        // Touch events
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.touch.startX = touch.clientX;
                this.touch.startY = touch.clientY;
                this.touch.currentX = touch.clientX;
                this.touch.currentY = touch.clientY;
                this.touch.isTouching = true;
                this.touch.isDragging = false;
            }
            e.preventDefault();
        }, { passive: false });
        
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.touch.currentX = touch.clientX;
                this.touch.currentY = touch.clientY;
                
                // Check if touch has moved enough to be considered a drag
                const dx = this.touch.currentX - this.touch.startX;
                const dy = this.touch.currentY - this.touch.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 10) { // Threshold for drag detection
                    this.touch.isDragging = true;
                }
            }
            e.preventDefault();
        }, { passive: false });
        
        window.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.touch.isTouching = false;
                
                // If touch ended without dragging, it's a tap
                if (!this.touch.isDragging) {
                    this.mouse.buttons[0] = true; // Simulate left click
                    // Reset after a short delay to allow click handlers to detect it
                    setTimeout(() => {
                        this.mouse.buttons[0] = false;
                    }, 50);
                }
                
                this.touch.isDragging = false;
            }
            e.preventDefault();
        }, { passive: false });
    }
    
    isKeyDown(key) {
        return this.keys[key.toLowerCase()] === true;
    }
    
    isMouseButtonDown(button = 0) {
        return this.mouse.buttons[button] === true;
    }
    
    isTouching() {
        return this.touch.isTouching;
    }
    
    isDragging() {
        return this.touch.isDragging;
    }
    
    getTouchDelta() {
        return {
            x: this.touch.currentX - this.touch.startX,
            y: this.touch.currentY - this.touch.startY
        };
    }
    
    getMousePosition() {
        return {
            x: this.mouse.x,
            y: this.mouse.y
        };
    }
    
    getWheelDelta() {
        const delta = this.mouse.wheelDelta;
        this.mouse.wheelDelta = 0; // Reset after reading
        return delta;
    }
    
    clear() {
        // Clear all input states
        this.mouse.buttons = {};
        this.mouse.wheelDelta = 0;
    }
    
    dispose() {
        // Clean up event listeners if needed
        window.removeEventListener('keydown', this.keydownHandler);
        window.removeEventListener('keyup', this.keyupHandler);
        // ... remove other event listeners
    }
}

export default InputHandler;

class UIManager {
    constructor() {
        // Cache DOM elements
        this.game = null;
        this.elements = {
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingProgress: document.getElementById('loading-progress'),
            loadingText: document.getElementById('loading-text'),
            mainMenu: document.getElementById('main-menu'),
            gameUI: document.getElementById('game-ui'),
            scoreContainer: document.getElementById('score-container'),
            player1Score: document.getElementById('player1-score'),
            player2Score: document.getElementById('player2-score'),
            turnIndicator: document.getElementById('turn-indicator'),
            powerMeter: {
                container: document.getElementById('power-meter'),
                fill: document.getElementById('power-fill'),
                text: document.getElementById('power-text')
            },
            messageBox: {
                container: document.getElementById('message-box'),
                title: document.getElementById('message-title'),
                text: document.getElementById('message-text'),
                button: document.getElementById('message-button')
            },
            // Modals
            howToPlayModal: document.getElementById('how-to-play-modal'),
            settingsModal: document.getElementById('settings-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            // Buttons
            startButton: document.getElementById('start-button'),
            howToPlayButton: document.getElementById('how-to-play-button'),
            settingsButton: document.getElementById('settings-button'),
            menuButton: document.getElementById('menu-button'),
            // Settings
            volumeSlider: document.getElementById('volume-slider'),
            graphicsQuality: document.getElementById('graphics-quality'),
            enableShadows: document.getElementById('enable-shadows'),
            // Game over
            gameOverTitle: document.getElementById('game-over-title'),
            gameOverText: document.getElementById('game-over-text'),
            playAgainButton: document.getElementById('play-again-button'),
            mainMenuButton: document.getElementById('main-menu-button')
        };

        // Initialize UI state
        this.currentScreen = 'loading';
        this.isMenuOpen = false;
        this.isModalOpen = false;
        
        // Bind event listeners
        this.bindEvents();
    }

    init(game) {
        this.game = game;
        this.bindEvents();
        this.updateLoadingProgress(0, 'Loading...');
    }

    showError(message) {
        console.error('UI Error:', message);
        try {
            if (this.elements.messageBox?.container) {
                this.showMessage('Error', message, 'OK', () => {
                    window.location.reload();
                });
            } else {
                // Fallback if UI isn't ready
                alert('Error: ' + message);
            }
        } catch (error) {
            console.error('Error showing error message:', error);
            alert('Error: ' + message);
        }
    }

    updateLoadingText(text) {
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = text;
        }
    }

    hideLoadingScreen() {
        console.log('Hiding loading screen...');
        const loadingOverlay = this.elements.loadingOverlay || document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                console.log('Loading screen hidden');
            }, 300);
        } else {
            console.warn('Loading overlay element not found');
            // Try direct DOM access as fallback
            const directAccess = document.getElementById('loading-overlay');
            if (directAccess) {
                directAccess.style.display = 'none';
                console.log('Loading screen hidden (fallback)');
            }
        }
    }

    bindEvents() {
        try {
            // Menu buttons
            if (this.elements.startButton) {
                this.elements.startButton.addEventListener('click', () => this.emit('startGame'));
            }
            if (this.elements.howToPlayButton) {
                this.elements.howToPlayButton.addEventListener('click', () => this.showModal('howToPlay'));
            }
            if (this.elements.settingsButton) {
                this.elements.settingsButton.addEventListener('click', () => this.showModal('settings'));
            }
            if (this.elements.menuButton) {
                this.elements.menuButton.addEventListener('click', () => this.toggleMenu());
            }
        
        } catch (error) {
            console.error('Error binding UI events:', error);
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => this.hideModal());
        });
        
        // Game over buttons
        this.elements.playAgainButton?.addEventListener('click', () => this.emit('playAgain'));
        this.elements.mainMenuButton?.addEventListener('click', () => this.showScreen('menu'));
        
        // Settings
        this.elements.volumeSlider?.addEventListener('input', (e) => {
            this.emit('volumeChange', parseFloat(e.target.value));
        });
        
        this.elements.graphicsQuality?.addEventListener('change', (e) => {
            this.emit('graphicsQualityChange', e.target.value);
        });
        
        this.elements.enableShadows?.addEventListener('change', (e) => {
            this.emit('shadowsToggle', e.target.checked);
        });
    }

    // Event system
    on(event, callback) {
        this._callbacks = this._callbacks || {};
        this._callbacks[event] = this._callbacks[event] || [];
        this._callbacks[event].push(callback);
        return this;
    }

    off(event, callback) {
        this._callbacks = this._callbacks || {};
        if (!this._callbacks[event]) return this;
        
        if (callback) {
            const index = this._callbacks[event].indexOf(callback);
            if (index !== -1) this._callbacks[event].splice(index, 1);
        } else {
            delete this._callbacks[event];
        }
        
        return this;
    }

    emit(event, ...args) {
        this._callbacks = this._callbacks || {};
        const callbacks = this._callbacks[event];
        if (callbacks) {
            callbacks.forEach(callback => callback.apply(this, args));
        }
        return this;
    }

    // Screen management
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show the requested screen
        switch(screenName) {
            case 'loading':
                this.elements.loadingOverlay.classList.remove('hidden');
                break;
            case 'menu':
                this.elements.mainMenu.classList.remove('hidden');
                break;
            case 'game':
                this.elements.gameUI.classList.remove('hidden');
                break;
        }
        
        this.currentScreen = screenName;
    }

    // Loading screen
    updateLoadingProgress(progress, message = '') {
        if (this.elements.loadingProgress) {
            this.elements.loadingProgress.style.width = `${progress * 100}%`;
        }
        
        if (this.elements.loadingText && message) {
            this.elements.loadingText.textContent = message;
        }
    }

    // Game UI
    updateScores(player1Score, player2Score) {
        if (this.elements.player1Score) {
            this.elements.player1Score.textContent = player1Score;
        }
        
        if (this.elements.player2Score) {
            this.elements.player2Score.textContent = player2Score;
        }
    }

    updateTurnIndicator(playerName, isPlayerTurn) {
        if (this.elements.turnIndicator) {
            this.elements.turnIndicator.textContent = `${playerName}'s Turn`;
            this.elements.turnIndicator.className = `turn-indicator ${isPlayerTurn ? 'player-turn' : 'ai-turn'}`;
        }
    }

    updatePowerMeter(power, maxPower = 1) {
        if (!this.elements.powerMeter.container) return;
        
        const percentage = Math.min(100, Math.max(0, (power / maxPower) * 100));
        
        if (this.elements.powerMeter.fill) {
            this.elements.powerMeter.fill.style.width = `${percentage}%`;
            
            // Change color based on power level
            if (percentage < 30) {
                this.elements.powerMeter.fill.style.backgroundColor = '#4CAF50'; // Green
            } else if (percentage < 70) {
                this.elements.powerMeter.fill.style.backgroundColor = '#FFC107'; // Yellow
            } else {
                this.elements.powerMeter.fill.style.backgroundColor = '#F44336'; // Red
            }
        }
        
        if (this.elements.powerMeter.text) {
            this.elements.powerMeter.text.textContent = `${Math.round(percentage)}%`;
        }
    }

    showPowerMeter(show = true) {
        if (this.elements.powerMeter.container) {
            this.elements.powerMeter.container.style.display = show ? 'block' : 'none';
        }
    }

    // Messages
    showMessage(title, message, buttonText = 'OK', callback = null) {
        const { messageBox } = this.elements;
        
        if (messageBox.title) messageBox.title.textContent = title;
        if (messageBox.text) messageBox.text.textContent = message;
        if (messageBox.button) {
            messageBox.button.textContent = buttonText;
            
            // Remove previous event listeners
            const newButton = messageBox.button.cloneNode(true);
            messageBox.button.parentNode.replaceChild(newButton, messageBox.button);
            this.elements.messageBox.button = newButton;
            
            // Add new event listener
            newButton.onclick = () => {
                this.hideModal();
                if (callback) callback();
            };
        }
        
        this.showModal('message');
    }

    // Modals
    showModal(modalName) {
        // Hide all modals first
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        
        // Show the requested modal
        const modal = this.elements[`${modalName}Modal`];
        if (modal) {
            modal.classList.add('active');
            this.isModalOpen = true;
            document.body.classList.add('modal-open');
        }
    }

    hideModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        
        this.isModalOpen = false;
        document.body.classList.remove('modal-open');
    }

    // Menu
    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        
        if (this.elements.mainMenu) {
            if (this.isMenuOpen) {
                this.elements.mainMenu.classList.add('menu-open');
            } else {
                this.elements.mainMenu.classList.remove('menu-open');
            }
        }
    }

    // Game over
    showGameOver(winner, playerScore, aiScore) {
        if (this.elements.gameOverTitle) {
            this.elements.gameOverTitle.textContent = winner === 'player' ? 'You Win!' : 'Game Over';
        }
        
        if (this.elements.gameOverText) {
            this.elements.gameOverText.textContent = `Final Score - You: ${playerScore} | AI: ${aiScore}`;
        }
        
        this.showModal('gameOver');
    }

    // Settings
    updateSettings(settings) {
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.value = settings.volume || 0.5;
        }
        
        if (this.elements.graphicsQuality) {
            this.elements.graphicsQuality.value = settings.graphicsQuality || 'medium';
        }
        
        if (this.elements.enableShadows) {
            this.elements.enableShadows.checked = settings.enableShadows !== false;
        }
    }

    // Cleanup
    dispose() {
        // Remove all event listeners
        // This is a simplified version - in a real app, you'd want to track and remove specific listeners
        const elements = [
            this.elements.startButton,
            this.elements.howToPlayButton,
            this.elements.settingsButton,
            this.elements.menuButton,
            this.elements.playAgainButton,
            this.elements.mainMenuButton,
            this.elements.volumeSlider,
            this.elements.graphicsQuality,
            this.elements.enableShadows,
            ...document.querySelectorAll('.modal-close')
        ];
        
        elements.forEach(element => {
            if (element) {
                const newElement = element.cloneNode(true);
                element.parentNode?.replaceChild(newElement, element);
            }
        });
        
        // Clear references
        Object.keys(this.elements).forEach(key => {
            this.elements[key] = null;
        });
    }
}

export default UIManager;

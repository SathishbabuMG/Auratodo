export class PomodoroTimer {
    constructor(options = {}) {
        this.timerProgress = document.getElementById('timer-progress');
        this.timerNumbers = document.getElementById('timer-numbers');
        this.timerLabel = document.getElementById('timer-label');
        this.btnPlayPause = document.getElementById('btn-play-pause');
        this.btnPlayText = document.getElementById('btn-play-text');
        this.playIcon = document.getElementById('play-icon');
        this.pauseIcon = document.getElementById('pause-icon');
        this.btnReset = document.getElementById('btn-reset');
        
        this.onComplete = options.onComplete || (() => {});
        this.onTick = options.onTick || (() => {});
        
        // Circumference for stroke calculation (2 * PI * r)
        // r = 95 -> 596.9026
        this.circumference = 596.9026;
        
        // Initialize state
        this.currentMode = 'work'; // 'work', 'short-break', 'long-break'
        this.workTime = 25 * 60;
        this.shortBreakTime = 5 * 60;
        this.longBreakTime = 15 * 60;
        
        this.duration = this.workTime;
        this.timeLeft = this.duration;
        this.isRunning = false;
        this.intervalId = null;
        
        this.initEvents();
        this.resetProgressRing();
        this.updateUI();
    }
    
    initEvents() {
        this.btnPlayPause.addEventListener('click', () => this.toggle());
        this.btnReset.addEventListener('click', () => this.reset());
        
        // Mode buttons
        const modeButtons = document.querySelectorAll('.btn-mode');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const mode = e.target.dataset.mode;
                const minutes = parseInt(e.target.dataset.time, 10);
                this.switchMode(mode, minutes);
            });
        });
    }
    
    switchMode(mode, minutes) {
        this.pause();
        this.currentMode = mode;
        this.duration = minutes * 60;
        this.timeLeft = this.duration;
        
        // Update label text
        if (mode === 'work') {
            this.timerLabel.textContent = 'FOCUS STATE';
        } else if (mode === 'short-break') {
            this.timerLabel.textContent = 'REST INTERVAL';
        } else {
            this.timerLabel.textContent = 'RECOVERY ZONE';
        }
        
        this.resetProgressRing();
        this.updateUI();
    }
    
    toggle() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.btnPlayText.textContent = 'Pause';
        this.playIcon.classList.add('hidden');
        this.pauseIcon.classList.remove('hidden');
        this.btnPlayPause.classList.add('active');
        
        this.intervalId = setInterval(() => {
            this.timeLeft--;
            this.updateUI();
            this.onTick(this.timeLeft);
            
            if (this.timeLeft <= 0) {
                this.complete();
            }
        }, 1000);
    }
    
    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.btnPlayText.textContent = 'Start';
        this.playIcon.classList.remove('hidden');
        this.pauseIcon.classList.add('hidden');
        this.btnPlayPause.classList.remove('active');
        
        clearInterval(this.intervalId);
    }
    
    reset() {
        this.pause();
        this.timeLeft = this.duration;
        this.resetProgressRing();
        this.updateUI();
    }
    
    complete() {
        this.pause();
        this.onComplete(this.currentMode);
        
        // Transition back or update cycle
        if (this.currentMode === 'work') {
            this.switchMode('short-break', 5);
            // Highlight Short Break button in DOM
            this.setActiveModeBtn('short-break');
        } else {
            this.switchMode('work', 25);
            this.setActiveModeBtn('work');
        }
    }
    
    setActiveModeBtn(mode) {
        const modeButtons = document.querySelectorAll('.btn-mode');
        modeButtons.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    resetProgressRing() {
        if (this.timerProgress) {
            this.timerProgress.style.strokeDashoffset = 0;
        }
    }
    
    updateUI() {
        // Update clock numbers
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const displayMin = String(minutes).padStart(2, '0');
        const displaySec = String(seconds).padStart(2, '0');
        this.timerNumbers.textContent = `${displayMin}:${displaySec}`;
        
        // Update document title for easy tracking in tab headers
        document.title = `(${displayMin}:${displaySec}) AuraFlow`;
        
        // Update SVG Progress stroke offset
        if (this.timerProgress) {
            const percentRemaining = this.timeLeft / this.duration;
            const offset = this.circumference * (1 - percentRemaining);
            this.timerProgress.style.strokeDashoffset = offset;
        }
    }
}

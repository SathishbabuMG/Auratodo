import { ParticleEngine } from './particles.js';
import { AudioSynthController } from './audio.js';
import { PomodoroTimer } from './timer.js';
import { KanbanBoard } from './kanban.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize background particle engine
    const particles = new ParticleEngine('particles-canvas');
    
    // 2. Initialize Audio Synthesizer
    const audio = new AudioSynthController();
    
    // Connect audio volume slider
    const volSlider = document.getElementById('sound-volume');
    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            audio.setVolume(e.target.value);
        });
    }

    // Connect sound selection buttons
    const soundButtons = document.querySelectorAll('.sound-item');
    soundButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const soundType = btn.dataset.sound;
            const isPlaying = audio.toggleSound(soundType);
            
            if (isPlaying) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    });

    // 3. Keep track of productivity stats
    let stats = {
        completed_pomodoros: 0,
        focus_minutes: 0,
        tasks_completed: 0
    };

    function updateStatsUI() {
        document.getElementById('stat-completed-poms').textContent = stats.completed_pomodoros;
        document.getElementById('stat-focus-time').textContent = stats.focus_minutes;
        document.getElementById('stat-completed-tasks').textContent = stats.tasks_completed;
        
        // Also update session counter badge in header
        const totalSessions = stats.completed_pomodoros;
        document.getElementById('session-count').textContent = `${totalSessions} Session${totalSessions === 1 ? '' : 's'}`;
    }

    // 4. Initialize Kanban Board
    const kanban = new KanbanBoard({
        onUpdate: (updatedTasks, statsModified) => {
            if (statsModified === 'completed_task') {
                stats.tasks_completed++;
                updateStatsUI();
            }
            saveServerData();
        }
    });

    // 5. Initialize Pomodoro Timer
    const timer = new PomodoroTimer({
        onTick: (timeLeft) => {
            // Can add subtle effects during timer ticking if desired
        },
        onComplete: (completedMode) => {
            // Trigger completion chord chime
            audio.playChimeAlert();
            
            // Trigger celebration particle blast at screen center
            particles.burst(window.innerWidth / 2, window.innerHeight / 2, 40);
            
            if (completedMode === 'work') {
                stats.completed_pomodoros++;
                stats.focus_minutes += 25; // 25 min work
                updateStatsUI();
                saveServerData();
            }
        }
    });

    // 6. Server synchronization (REST APIs)
    async function loadServerData() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error("Network status was not OK");
            
            const data = await response.json();
            
            // Map state variables
            stats = data.stats || stats;
            kanban.setTasks(data.tasks || []);
            
            updateStatsUI();
        } catch (e) {
            console.error("Could not sync with Flask API server:", e);
            // Fallback load from localStorage if python server has issues
            const cached = localStorage.getItem('auraflow_fallback_data');
            if (cached) {
                const data = JSON.parse(cached);
                stats = data.stats || stats;
                kanban.setTasks(data.tasks || []);
                updateStatsUI();
            }
        }
    }

    async function saveServerData() {
        const payload = {
            tasks: kanban.tasks,
            stats: stats
        };
        
        // Backup to localStorage
        localStorage.setItem('auraflow_fallback_data', JSON.stringify(payload));
        
        try {
            await fetch('/api/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Could not sync data payload to API server:", e);
        }
    }

    // 7. Aesthetics & Date/Time Management
    function updateDateAndTheme() {
        const dateBadge = document.getElementById('current-date');
        const now = new Date();
        
        // Format: "Fri, Jul 17"
        dateBadge.textContent = now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        // Set color theme depending on time of day
        const hours = now.getHours();
        const body = document.body;
        const greetingLabel = document.getElementById('greeting-time');
        
        body.classList.remove('theme-morning', 'theme-afternoon', 'theme-evening', 'theme-night');
        
        if (hours >= 5 && hours < 12) {
            body.classList.add('theme-morning');
            greetingLabel.textContent = 'Good morning';
        } else if (hours >= 12 && hours < 17) {
            body.classList.add('theme-afternoon');
            greetingLabel.textContent = 'Good afternoon';
        } else if (hours >= 17 && hours < 21) {
            body.classList.add('theme-evening');
            greetingLabel.textContent = 'Good evening';
        } else {
            body.classList.add('theme-night');
            greetingLabel.textContent = 'Quiet hours';
        }
    }

    // Fire initial setup calls
    updateDateAndTheme();
    loadServerData();
    
    // Keep date/theme updated every minute
    setInterval(updateDateAndTheme, 60000);
});

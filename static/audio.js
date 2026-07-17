export class AudioSynthController {
    constructor() {
        this.ctx = null;
        this.activeSounds = {};
        this.masterVolume = null;
        this.volumeLevel = 0.5;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Create Master Gain Node
            this.masterVolume = this.ctx.createGain();
            this.masterVolume.gain.value = this.volumeLevel;
            this.masterVolume.connect(this.ctx.destination);
            
            this.initialized = true;
            console.log("Web Audio API Context initialized successfully.");
        } catch (e) {
            console.error("Web Audio API is not supported in this browser:", e);
        }
    }

    setVolume(value) {
        this.volumeLevel = Math.max(0, Math.min(1, parseFloat(value)));
        if (this.masterVolume && this.ctx) {
            this.masterVolume.gain.linearRampToValueAtTime(this.volumeLevel, this.ctx.currentTime + 0.1);
        }
    }

    // Helper: Generate White Noise Buffer
    createWhiteNoiseBuffer() {
        const bufferSize = 5 * this.ctx.sampleRate; // 5 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Helper: Generate Brownian Noise Buffer
    createBrownianNoiseBuffer() {
        const bufferSize = 5 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Brownian accumulation equation
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Gain compensation
        }
        return buffer;
    }

    toggleSound(type) {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (this.activeSounds[type]) {
            this.stopSound(type);
            return false;
        } else {
            this.playSound(type);
            return true;
        }
    }

    playSound(type) {
        if (!this.initialized) return;

        // Ensure we stop if already playing
        if (this.activeSounds[type]) {
            this.stopSound(type);
        }

        const nodes = {};
        
        if (type === 'brownian') {
            // Focus Noise (Deep Brownian)
            const source = this.ctx.createBufferSource();
            source.buffer = this.createBrownianNoiseBuffer();
            source.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 350; // Deep low pass rumble

            const gain = this.ctx.createGain();
            gain.gain.value = 0.8;

            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);

            source.start(0);

            nodes.source = source;
            nodes.gain = gain;
        } 
        else if (type === 'rain') {
            // Rain Shower Simulator
            const source = this.ctx.createBufferSource();
            source.buffer = this.createWhiteNoiseBuffer();
            source.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 600;
            filter.Q.value = 1.0;

            // Low frequency modulator for gusty/patter effects
            const modulator = this.ctx.createOscillator();
            modulator.frequency.value = 0.5; // Slow volume swell

            const modGain = this.ctx.createGain();
            modGain.gain.value = 0.15;

            // Rain crackle (fast amplitude modulator)
            const crackleOsc = this.ctx.createOscillator();
            crackleOsc.type = 'triangle';
            crackleOsc.frequency.value = 8; // 8 Hz patters

            const crackleGain = this.ctx.createGain();
            crackleGain.gain.value = 0.08;

            const gain = this.ctx.createGain();
            gain.gain.value = 0.4;

            // Wire up modulators to gain values
            modulator.connect(modGain);
            modGain.connect(gain.gain);
            crackleOsc.connect(crackleGain);
            crackleGain.connect(gain.gain);

            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);

            modulator.start(0);
            crackleOsc.start(0);
            source.start(0);

            nodes.source = source;
            nodes.modulator = modulator;
            nodes.crackle = crackleOsc;
            nodes.gain = gain;
        } 
        else if (type === 'ocean') {
            // Ocean Wave Swell Simulator
            const source = this.ctx.createBufferSource();
            source.buffer = this.createBrownianNoiseBuffer();
            source.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 250;

            // Slow LFO to swell the ocean waves (every 8 seconds)
            const waveLfo = this.ctx.createOscillator();
            waveLfo.type = 'sine';
            waveLfo.frequency.value = 0.125; // 8 second cycle

            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 150; // Swells from 100Hz to 400Hz

            const gain = this.ctx.createGain();
            gain.gain.value = 0.7;

            // LFO controls lowpass cutoff frequency
            waveLfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);

            // Connect output
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);

            waveLfo.start(0);
            source.start(0);

            nodes.source = source;
            nodes.lfo = waveLfo;
            nodes.gain = gain;
        }

        this.activeSounds[type] = nodes;
    }

    stopSound(type) {
        const nodes = this.activeSounds[type];
        if (!nodes) return;

        // Fade out smoothly to avoid popping clicks
        if (nodes.gain && this.ctx) {
            const currentVal = nodes.gain.gain.value;
            nodes.gain.gain.setValueAtTime(currentVal, this.ctx.currentTime);
            nodes.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
        }

        setTimeout(() => {
            try {
                if (nodes.source) nodes.source.stop();
                if (nodes.modulator) nodes.modulator.stop();
                if (nodes.crackle) nodes.crackle.stop();
                if (nodes.lfo) nodes.lfo.stop();
            } catch (e) {
                // Already stopped
            }
        }, 500);

        delete this.activeSounds[type];
    }

    // Play meditative alarm chimes
    playChimeAlert() {
        this.init();
        if (!this.initialized) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const gainNode = this.ctx.createGain();
        gainNode.connect(this.masterVolume);

        // Define beautiful meditative chord (Solfeggio 528Hz and harmonics)
        const frequencies = [264, 396, 528, 660];
        const oscillators = [];

        // Fade chime in quickly and fade out very slowly
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.6, now + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 4.5);

        frequencies.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            // Connect
            osc.connect(gainNode);
            // Stagger start times slightly
            osc.start(now + (idx * 0.05));
            osc.stop(now + 5.0);
            
            oscillators.push(osc);
        });
    }
}

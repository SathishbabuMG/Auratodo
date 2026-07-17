export class ParticleEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = 80;
        this.mouse = {
            x: null,
            y: null,
            radius: 150
        };
        
        // Base theme colors (will extract from CSS dynamically)
        this.colorStart = '#8b5cf6';
        this.colorEnd = '#ec4899';
        
        this.resize();
        this.updateColors();
        this.init();
        this.animate();
        
        // Retrieve computed colors on an interval rather than every frame to avoid layout thrashing
        setInterval(() => this.updateColors(), 2000);
        
        window.addEventListener('resize', () => this.resize());
        
        // Listen to mouse events on document so particles respond anywhere
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        document.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.init();
    }
    
    // Extract current CSS theme colors
    updateColors() {
        const rootStyles = getComputedStyle(document.documentElement);
        this.colorStart = rootStyles.getPropertyValue('--accent-start').trim() || '#8b5cf6';
        this.colorEnd = rootStyles.getPropertyValue('--accent-end').trim() || '#ec4899';
    }
    
    init() {
        this.particles = [];
        const numParticles = Math.min(this.maxParticles, (this.canvas.width * this.canvas.height) / 18000);
        
        for (let i = 0; i < numParticles; i++) {
            this.particles.push(this.createParticle(false));
        }
    }
    
    createParticle(isBurst = false, x = null, y = null) {
        const angle = Math.random() * Math.PI * 2;
        const speed = isBurst ? Math.random() * 5 + 2 : Math.random() * 0.4 + 0.1;
        
        return {
            x: x !== null ? x : Math.random() * this.canvas.width,
            y: y !== null ? y : Math.random() * this.canvas.height,
            size: Math.random() * (isBurst ? 4 : 5) + 1.5,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (isBurst ? 0 : 0.2), // slow upwards bias
            opacity: Math.random() * 0.5 + 0.15,
            life: isBurst ? 1.0 : null,
            decay: isBurst ? Math.random() * 0.02 + 0.01 : null
        };
    }
    
    burst(x, y, count = 25) {
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(true, x, y));
        }
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Move particle
            p.x += p.vx;
            p.y += p.vy;
            
            // Handle burst life or boundary checking
            if (p.life !== null) {
                p.life -= p.decay;
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    i--;
                    continue;
                }
            } else {
                // Regular particle screen wrapping
                if (p.x < 0) p.x = this.canvas.width;
                if (p.x > this.canvas.width) p.x = 0;
                if (p.y < 0) p.y = this.canvas.height;
                if (p.y > this.canvas.height) p.y = 0;
            }
            
            // Interact with mouse
            if (this.mouse.x !== null && this.mouse.y !== null && p.life === null) {
                const dx = p.x - this.mouse.x;
                const dy = p.y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.mouse.radius) {
                    const force = (this.mouse.radius - dist) / this.mouse.radius;
                    // Push particles slightly away
                    p.x += (dx / dist) * force * 1.5;
                    p.y += (dy / dist) * force * 1.5;
                }
            }
            
            // Draw particle
            const currentOpacity = p.life !== null ? p.opacity * p.life : p.opacity;
            
            // Draw glowing circles
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            
            // Create gradient for particle based on screen position
            const gradient = this.ctx.createLinearGradient(p.x - p.size, p.y - p.size, p.x + p.size, p.y + p.size);
            gradient.addColorStop(0, this.hexToRgba(this.colorStart, currentOpacity));
            gradient.addColorStop(1, this.hexToRgba(this.colorEnd, currentOpacity * 0.3));
            
            this.ctx.fillStyle = gradient;
            this.ctx.shadowBlur = p.life !== null ? 12 : 3;
            this.ctx.shadowColor = this.colorStart;
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // reset
        }
        
        // Draw connection lines
        this.drawConnections();
        
        requestAnimationFrame(() => this.animate());
    }
    
    drawConnections() {
        const maxDist = 110;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                
                // Don't connect burst particles to prevent clutter
                if (p1.life !== null || p2.life !== null) continue;
                
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.12;
                    this.ctx.strokeStyle = this.hexToRgba(this.colorStart, alpha);
                    this.ctx.lineWidth = 0.7;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    // Helper to format Hex values to RGBA dynamically
    hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

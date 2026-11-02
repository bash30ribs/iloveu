import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HandTracker } from './HandTracker.js';

/* ═══════════════════════════════════════════════════════════
   NOSTALGIC MUSIC BOX ENGINE (Web Audio API)
   Generates a sweet, cozy music box pluck and random wind-chime chords.
═══════════════════════════════════════════════════════════ */
class MusicBoxEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = false;
        this.melodyInterval = null;
        // Key of G Major pentatonic for sweet, non-dissonant melodies
        this.scale = [196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99];
    }

    _ensure() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
    }

    _resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    // Music Box tooth pluck: high pitch, rapid attack, exponential decay, metallic resonance
    pluck(freq, volume = 0.35, delay = 0) {
        if (!this.enabled) return;
        this._ensure(); this._resume();

        const time = this.ctx.currentTime + delay;
        
        // Principal note oscillator
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        // Metallic overtones (2nd and 4th harmonics for high bell sound)
        const overtone1 = this.ctx.createOscillator();
        const overtoneGain1 = this.ctx.createGain();
        overtone1.type = 'sine';
        overtone1.frequency.setValueAtTime(freq * 2.0, time);

        const overtone2 = this.ctx.createOscillator();
        const overtoneGain2 = this.ctx.createGain();
        overtone2.type = 'sine';
        overtone2.frequency.setValueAtTime(freq * 3.01, time); // slightly detuned for organic sound

        // Envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);

        overtoneGain1.gain.setValueAtTime(0, time);
        overtoneGain1.gain.linearRampToValueAtTime(volume * 0.4, time + 0.003);
        overtoneGain1.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

        overtoneGain2.gain.setValueAtTime(0, time);
        overtoneGain2.gain.linearRampToValueAtTime(volume * 0.2, time + 0.002);
        overtoneGain2.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        // Connect
        osc.connect(gain);
        overtone1.connect(overtoneGain1);
        overtone2.connect(overtoneGain2);

        gain.connect(this.masterGain);
        overtoneGain1.connect(this.masterGain);
        overtoneGain2.connect(this.masterGain);

        osc.start(time);
        overtone1.start(time);
        overtone2.start(time);

        osc.stop(time + 2.0);
        overtone1.stop(time + 2.0);
        overtone2.stop(time + 2.0);
    }

    // Play a gentle music box chord arpeggio
    arpeggio(baseFreq) {
        if (!this.enabled) return;
        const root = baseFreq;
        const third = baseFreq * 1.25;
        const fifth = baseFreq * 1.5;
        const octave = baseFreq * 2.0;

        this.pluck(root, 0.25, 0);
        this.pluck(third, 0.22, 0.08);
        this.pluck(fifth, 0.20, 0.16);
        this.pluck(octave, 0.15, 0.24);
    }

    // Magical chime run for explosion
    magicFanfare() {
        if (!this.enabled) return;
        const run = [392.00, 440.00, 493.88, 587.33, 659.25, 783.99, 880.00, 987.77, 1174.66];
        run.forEach((freq, idx) => {
            this.pluck(freq, 0.22, idx * 0.07);
        });
    }

    // Camera capture shutter sound (wooden box click + bell chime)
    shutter() {
        if (!this.enabled) return;
        this._ensure(); this._resume();
        this.pluck(660, 0.2, 0);
        this.pluck(880, 0.15, 0.04);
        
        // Wooden click
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.02, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i * 0.01);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.15;
        src.connect(gain);
        gain.connect(this.masterGain);
        src.start();
    }

    // Sobbing note (gentle, warm accordion chord sliding down)
    sob() {
        this._ensure(); this._resume();
        const base = 220;
        [base, base * 1.2, base * 1.5].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(f * 0.9, this.ctx.currentTime + 1.5);

            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 2.0);
        });
    }

    // Wax seal break & love letter opening chime
    letterOpenChime() {
        if (!this.enabled) return;
        this._ensure(); this._resume();
        const notes = [329.63, 392.00, 493.88, 587.33, 783.99, 987.77];
        notes.forEach((f, idx) => {
            this.pluck(f, 0.22, idx * 0.08);
        });
    }

    // 3D formation switch chime
    layoutTransitionSound() {
        if (!this.enabled) return;
        this._ensure(); this._resume();
        const chord = [293.66, 369.99, 440.00, 587.33];
        chord.forEach((f, idx) => {
            this.pluck(f, 0.2, idx * 0.06);
        });
    }

    // Tour slide advance bell note
    tourSlideChime() {
        if (!this.enabled) return;
        this._ensure(); this._resume();
        this.pluck(523.25, 0.22, 0);
        this.pluck(783.99, 0.16, 0.08);
    }

    // Generative wind chime ambient background
    startMelody() {
        this._ensure(); this._resume();
        if (this.melodyInterval) return;

        const playNote = () => {
            if (!this.enabled) return;
            const noteIdx = Math.floor(Math.random() * this.scale.length);
            const freq = this.scale[noteIdx];
            const volume = 0.12 + Math.random() * 0.12;
            
            // Randomly play single note, double note, or small arpeggio
            const chance = Math.random();
            if (chance < 0.6) {
                this.pluck(freq, volume);
            } else if (chance < 0.85) {
                this.pluck(freq, volume);
                const secondNote = this.scale[(noteIdx + 2) % this.scale.length];
                this.pluck(secondNote, volume * 0.7, 0.15);
            } else {
                this.arpeggio(freq * 0.5);
            }

            // Set next note time randomly between 2 and 5 seconds
            const nextDelay = 2000 + Math.random() * 3000;
            this.melodyInterval = setTimeout(playNote, nextDelay);
        };

        playNote();
    }

    stopMelody() {
        if (this.melodyInterval) {
            clearTimeout(this.melodyInterval);
            this.melodyInterval = null;
        }
    }
}

/* ═══════════════════════════════════════════════════════════
   SUBTLE TOAST NOTIFICATION (Paper Card)
═══════════════════════════════════════════════════════════ */
function showToast(msg, type = 'gold', duration = 2400) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
}

/* ═══════════════════════════════════════════════════════════
   POLAROID DYNAMIC CANVAS TEXTURE CREATOR
═══════════════════════════════════════════════════════════ */
class PolaroidTextureBuilder {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 680;
        this.ctx = this.canvas.getContext('2d');

        this.backCanvas = document.createElement('canvas');
        this.backCanvas.width = 512;
        this.backCanvas.height = 680;
        this.backCtx = this.backCanvas.getContext('2d');
    }

    createTexture(imgElementOrTexture, caption = '', onLoadCallback = null) {
        const build = (image) => {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;

            // 1. Draw polaroid card background (warm, slightly aged linen paper texture color)
            ctx.fillStyle = '#fdfcf7';
            ctx.fillRect(0, 0, w, h);

            // Subtle inner border line for depth
            ctx.strokeStyle = '#efeae0';
            ctx.lineWidth = 1;
            ctx.strokeRect(4, 4, w - 8, h - 8);

            // 2. Draw shadow gradient inside the photo cutout
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(28, 28, w - 56, h - 140);

            // 3. Draw actual photo image inside cutout
            try {
                if (image && image.complete !== false) {
                    // Fit cover style calculation
                    const targetW = w - 64;
                    const targetH = h - 150;
                    const aspectImg = image.width / image.height;
                    const aspectTarget = targetW / targetH;
                    
                    let sx = 0, sy = 0, sw = image.width, sh = image.height;
                    if (aspectImg > aspectTarget) {
                        sw = image.height * aspectTarget;
                        sx = (image.width - sw) / 2;
                    } else {
                        sh = image.width / aspectTarget;
                        sy = (image.height - sh) / 2;
                    }
                    
                    ctx.drawImage(image, sx, sy, sw, sh, 32, 32, targetW, targetH);
                } else {
                    // Fallback visual placeholder if image hasn't loaded yet
                    ctx.fillStyle = '#eae5d8';
                    ctx.fillRect(32, 32, w - 64, h - 150);
                    ctx.font = '24px sans-serif';
                    ctx.fillStyle = '#a69d8d';
                    ctx.textAlign = 'center';
                    ctx.fillText('Loading image...', w / 2, h / 2 - 40);
                }
            } catch (err) {
                console.error('Error drawing image to polaroid:', err);
            }

            // 4. Subtle photo shadow borders (simulate actual print sticker)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.lineWidth = 2;
            ctx.strokeRect(32, 32, w - 64, h - 150);

            // 5. Draw Handwritten Caption at the bottom vellum area
            ctx.font = '36px "Caveat", cursive';
            ctx.fillStyle = '#2b251f'; // Ink charcoal
            ctx.textAlign = 'center';
            
            // Text wrap for long comments
            const maxTextW = w - 80;
            const words = caption.split(' ');
            let line = '';
            const lines = [];
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxTextW && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            // Only draw up to 2 lines of caption to avoid spilling out
            const startY = h - 85;
            for (let k = 0; k < Math.min(lines.length, 2); k++) {
                ctx.fillText(lines[k].trim(), w / 2, startY + k * 38);
            }

            // Create and update ThreeJS texture
            const texture = new THREE.CanvasTexture(this.canvas);
            texture.needsUpdate = true;
            if (onLoadCallback) onLoadCallback(texture);
            return texture;
        };

        // If the source image is passed as a string or ThreeJS texture, handle it
        if (typeof imgElementOrTexture === 'string') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => build(img);
            img.src = imgElementOrTexture;
        } else if (imgElementOrTexture instanceof HTMLImageElement) {
            if (imgElementOrTexture.complete) {
                build(imgElementOrTexture);
            } else {
                imgElementOrTexture.onload = () => build(imgElementOrTexture);
            }
        } else {
            // Static empty polaroid template
            build(null);
        }

        return new THREE.CanvasTexture(this.canvas);
    }

    createBackTexture(index, dateStr = '') {
        const ctx = this.backCtx;
        const w = this.backCanvas.width;
        const h = this.backCanvas.height;

        // 1. Cozy warm vintage paper backing
        ctx.fillStyle = '#f6f2e8'; 
        ctx.fillRect(0, 0, w, h);

        // Subtle inner border line for depth
        ctx.strokeStyle = '#efeae0';
        ctx.lineWidth = 1;
        ctx.strokeRect(4, 4, w - 8, h - 8);

        // Faint paper texture noise
        ctx.fillStyle = 'rgba(43, 37, 31, 0.015)';
        for (let i = 0; i < 500; i += 5) {
            ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
        }

        // 2. Divider line down center
        ctx.strokeStyle = 'rgba(43, 37, 31, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w / 2, 60);
        ctx.lineTo(w / 2, h - 60);
        ctx.stroke();

        // 3. Address writing lines (right side)
        ctx.strokeStyle = 'rgba(43, 37, 31, 0.08)';
        ctx.lineWidth = 1.5;
        for (let j = 0; j < 3; j++) {
            ctx.beginPath();
            ctx.moveTo(w / 2 + 30, h / 2 + j * 45 + 30);
            ctx.lineTo(w - 30, h / 2 + j * 45 + 30);
            ctx.stroke();
        }

        // 4. Vintage Postage Stamp (top right)
        const stampX = w - 120;
        const stampY = 50;
        const stampW = 80;
        const stampH = 95;

        // Dotted stamp border
        ctx.strokeStyle = '#c5bea9';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(stampX, stampY, stampW, stampH);
        ctx.setLineDash([]);

        // Stamp background fill
        ctx.fillStyle = '#ebdcc0';
        ctx.fillRect(stampX + 3, stampY + 3, stampW - 6, stampH - 6);

        // Stamp rose icon
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌹', stampX + stampW / 2, stampY + stampH / 2);

        // 5. Handwritten postal note (left side)
        ctx.font = '30px "Caveat", cursive';
        ctx.fillStyle = 'rgba(43, 37, 31, 0.7)'; // faded ink
        ctx.textAlign = 'left';

        const displayDate = dateStr || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        ctx.fillText(`Date: ${displayDate}`, 40, 95);

        ctx.font = '28px "Caveat", cursive';
        ctx.fillText('Written inside', 40, 180);
        ctx.fillText('our quiet box.', 40, 220);
        ctx.fillText('Forever saved,', 40, 310);
        ctx.fillText('always & forever.', 40, 350);
        ctx.fillText('♥', 40, 410);

        const texture = new THREE.CanvasTexture(this.backCanvas);
        texture.needsUpdate = true;
        return texture;
    }
}


/* ═══════════════════════════════════════════════════════════
   MAIN MEMORY THEATER / BOX CLASS
═══════════════════════════════════════════════════════════ */
class MemoryBoxTheater {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d0b12);
        this.scene.fog = new THREE.FogExp2(0x0d0b12, 0.04);
        
        this.audio = new MusicBoxEngine();
        this.textureBuilder = new PolaroidTextureBuilder();

        // Camera
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 8);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Post-processing — Soft glow bloom
        const renderScene = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.3, 0.9);
        bloomPass.threshold = 0.25;
        bloomPass.strength  = 0.65;
        bloomPass.radius    = 0.4;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);

        this.clock = new THREE.Clock();
        this.rotVelY = 0;
        this.rotVelX = 0;

        // Reusable scratch variables to avoid GC allocations in render tick
        this._tmpVec1 = new THREE.Vector3();
        this._tmpVec2 = new THREE.Vector3();
        this._tmpTargetPos = new THREE.Vector3();
        this._tmpCurQ = new THREE.Quaternion();
        this._tmpTgtQ = new THREE.Quaternion();
        this._raycaster = new THREE.Raycaster();
        this._ndc = new THREE.Vector2();

        // Tracker reference
        this.tracker = null;

        this.memoryMeshes = [];
        this.hoveredMesh  = null;
        this.focusedMesh  = null;
        this.focusedIndex = -1;
        this.isExploding  = false;
        this.meshVelocities = [];
        this.explosionTimer = null;
        this.hasUserPhotos  = false;
        this.lastSmileTime  = 0;
        this.lastFocusedMesh = null;
        this._lastNavTime = 0;
        this._lastPinchTime = 0;
        this._lastPeaceTime = 0;
        this._lastLoveTime = 0;
        this._lastScreenshotTime = 0;
        this._lastComplimentIndex = -1;

        // 3D Formation, Atmosphere, Tour, and Love Letter state
        this.currentLayout = 'sphere';
        this.currentTheme = 'candlelit';
        this.isTouring = false;
        this.tourIndex = 0;
        this.tourPaused = false;
        this.tourProgress = 0;
        this.tourSlideDuration = 5500;
        this.tourStartTime = 0;
        this.letterText = "";
        this.creatorUsername = "Your Secret Admirer";
        this.targetName = "My Love";
        this.letterDate = "Forever & Always";

        this.compliments = [
            "✨ That smile should come with a warning... it completely derailed my train of thought.",
            "🌹 You have that quiet kind of beauty that doesn't ask for attention, but commands it anyway.",
            "🕯️ You smile and suddenly the whole room feels warmer, like candlelight on velvet.",
            "🍯 Keep smiling like that and I might just fall for you all over again.",
            "💫 I don't know what kind of magic that was, but your smile just rearranged my whole day.",
            "📖 There are whole galaxies behind your eyes, and I'm hopelessly lost in them.",
            "🌧️ You smile and the world feels a little softer, like rainfall on warm earth.",
            "🎨 If watching you smile was an art form, I'd spend a lifetime in your gallery.",
            "🌙 You don't even try, do you? Just effortlessly outshining everything around you.",
            "📜 That subtle curve of your lips has more poetry in it than any book I've ever read.",
            "💓 I swear every time you smile, my heart skips a beat it never gets back.",
            "🎶 You have the kind of smile people write love songs about at two in the morning.",
            "⚖️ Honestly, having you look this breathtaking should probably be against the law.",
            "⭐ The stars had to dim themselves tonight just to give your smile the spotlight.",
            "☕ You make being near you feel like drinking warm honey tea on a chilly evening.",
            "🕊️ The prettiest curve on you will always be that gentle smile.",
            "📻 Your laughter is my favorite frequency. Never let the world quiet it down.",
            "💌 You have that rare presence where simply smiling feels like a sweet confession.",
            "🌻 If I had a flower for every time your smile made my chest ache, I'd walk in gardens forever.",
            "👑 Are you always this mesmerizing when you're happy, or am I just getting the VIP view?",
            "🌊 You have no idea how effortlessly you hold my entire focus when you smile like that.",
            "✨ A single smile from you and everything else in this world just blurs into background noise.",
            "🏡 You smile and it feels like coming home after a long journey in the rain.",
            "🧲 I never believed in gravity pulling hearts until I saw that sweet smile of yours.",
            "👀 The way your eyes crinkle when you smile... that right there is my favorite thing.",
            "🕯️ You're living proof that the sweetest things in life aren't things—they're moments with you.",
            "🔒 Careful now... smile like that once more and I won't be able to look away at all.",
            "✒️ You make ordinary moments feel like private poetry written just for the two of us.",
            "🕊️ You look the way peace feels. Don't ever stop smiling like that.",
            "⏳ I could listen to you and watch you smile for hours and still think it wasn't enough time.",
            "💎 You have a smile that makes people want to be the reason behind it.",
            "🌹 How do you look so effortlessly gentle and yet hit me with that much impact?",
            "🪄 That little smile right there? That's my absolute weakness, hands down."
        ];

        this.initLights();
        this.initBokehBackground();
        this.initMemories();
        this.initHandCursor();
        this.initFireworks(); // magical sparkles on love gesture

        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Touch controls fallback (mobile compatibility)
        this.initTouchControls();
        
        // Adapt initial camera distance for vertical phone screens
        if (window.innerWidth < 768) {
            this.camera.position.set(0, 0, 11);
        }
        
        // Start render loop
        this.animate();
        
        this.uiSetup();
    }

    /* ──────────────────────────────────────────
       COZY AMBIENT LIGHTS (ThreeJS)
    ────────────────────────────────────────── */
    initLights() {
        // Soft warm candlelight ambient
        this.ambientLight = new THREE.AmbientLight(0xfff8e7, 0.7);
        this.scene.add(this.ambientLight);

        // Directional warm light to give depth shadow to polaroids
        this.dirLight = new THREE.DirectionalLight(0xffeacc, 0.9);
        this.dirLight.position.set(5, 5, 4);
        this.scene.add(this.dirLight);

        // Additional gold back-light
        this.pointLight = new THREE.PointLight(0xd4af37, 1.2, 20);
        this.pointLight.position.set(0, 0, -2);
        this.scene.add(this.pointLight);
    }

    /* ──────────────────────────────────────────
       FLOATING BOKEH EMBERS & DUST SYSTEM
    ────────────────────────────────────────── */
    initBokehBackground() {
        this.bokehGroup = new THREE.Group();
        this.scene.add(this.bokehGroup);

        // Render larger transparent floating soft gold spheres (bokeh embers)
        const bokehCount = 45;
        const geom = new THREE.SphereGeometry(0.5, 16, 16);
        
        for (let i = 0; i < bokehCount; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.4 ? 0xd4af37 : 0xdca2a8,
                transparent: true,
                opacity: 0.05 + Math.random() * 0.15,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geom, mat);
            
            // Random positioning in space
            mesh.position.set(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 15 - 5
            );
            
            // Save drift direction
            mesh.userData = {
                driftSpeedX: (Math.random() - 0.5) * 0.01,
                driftSpeedY: (Math.random() - 0.5) * 0.015,
                pulseSpeed: 0.5 + Math.random() * 1.5,
                baseScale: 0.4 + Math.random() * 1.6,
                phase: Math.random() * Math.PI
            };
            mesh.scale.setScalar(mesh.userData.baseScale);
            this.bokehGroup.add(mesh);
        }

        // Add soft dust motes
        const dustCount = 400;
        const dustGeom = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        for(let i=0; i<dustCount; i++) {
            dustPositions[i*3] = (Math.random() - 0.5) * 25;
            dustPositions[i*3+1] = (Math.random() - 0.5) * 20;
            dustPositions[i*3+2] = (Math.random() - 0.5) * 15;
        }
        dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        
        const cv = document.createElement('canvas');
        cv.width = cv.height = 16;
        const cx = cv.getContext('2d');
        const gr = cx.createRadialGradient(8, 8, 0, 8, 8, 8);
        gr.addColorStop(0, 'rgba(212,175,55,0.6)');
        gr.addColorStop(1, 'rgba(212,175,55,0)');
        cx.fillStyle = gr;
        cx.fillRect(0,0,16,16);

        const dustMat = new THREE.PointsMaterial({
            size: 0.08,
            map: new THREE.CanvasTexture(cv),
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.dustPoints = new THREE.Points(dustGeom, dustMat);
        this.scene.add(this.dustPoints);
    }

    /* ──────────────────────────────────────────
       INITIALIZE PHOTO ALBUM CAROU/SPHERE
    ────────────────────────────────────────── */
    initMemories() {
        this.carouselGroup = new THREE.Group();
        this.scene.add(this.carouselGroup);

        const urlParams = new URLSearchParams(window.location.search);
        const shareId   = urlParams.get('share');

        if (shareId) {
            this.hasUserPhotos = true;
            fetch(`/api/share/${shareId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.target_name || data.creator_username) {
                        this.targetName = data.target_name || 'My Love';
                        const creator = data.creator_username || 'Your Secret Admirer';
                        this.creatorUsername = creator;
                        this.letterText = data.letter_text || "";
                        this.letterDate = data.created_at || "Forever & Always";
                        const q = document.getElementById('love-question');
                        const qSub = document.getElementById('love-question-sub');
                        if (q) q.innerText = `A memory box for ${this.targetName} 🌹`;
                        if (qSub) qSub.innerText = `Crafted with deep love by ${creator} • ${data.created_at || 'Forever & always'}`;
                        showToast(`A love keepsake from ${creator} to ${this.targetName} 💌`, 'gold', 4500);

                        if (data.letter_text) {
                            setTimeout(() => {
                                showToast('💌 You have a sealed love letter waiting! Tap "Love Letter" to read it.', 'rose', 6500);
                            }, 3200);
                        }
                    }
                    if (data.images && data.images.length > 0) {
                        data.images.forEach((url, i) => {
                            this.addPhotoToGlobe(url, i, `Memory #${i+1}`);
                        });
                        this.recalculateGlobe();
                        this._updatePhotoCounter();
                    }
                })
                .catch(e => console.error('Error loading shared box:', e));
        } else {
            // Load beautiful mock images
            for (let i = 0; i < 20; i++) {
                const url = `https://picsum.photos/seed/${i + 70}/400/600`;
                this.addPhotoToGlobe(url, i, `Warm memory ${i + 1}`);
            }
            this.recalculateGlobe();
        }
    }

    /* ──────────────────────────────────────────
       CREATE POLAROID PHOTO MESH WITH SHADOW
    ────────────────────────────────────────── */
    addPhotoToGlobe(imgUrl, index, captionText = '') {
        // Create canvas container to build polaroid card image
        const builder = new PolaroidTextureBuilder();
        
        // 1. Front texture material (holds photo)
        const matFront = new THREE.MeshStandardMaterial({
            roughness: 0.5,
            metalness: 0.05,
            transparent: true,
            opacity: 0.95
        });

        // 2. Back texture material (holds postcard backing)
        const matBack = new THREE.MeshStandardMaterial({
            roughness: 0.6,
            metalness: 0.02,
            transparent: true,
            opacity: 0.95,
            map: builder.createBackTexture(index)
        });

        // 3. Side edge material (warm plain paper color #f6f2e8)
        const matEdge = new THREE.MeshStandardMaterial({
            color: 0xf6f2e8,
            roughness: 0.8,
            metalness: 0.01
        });

        // Load the image and paint polaroid front
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            matFront.map = builder.createTexture(img, captionText);
            matFront.needsUpdate = true;
        };
        img.src = imgUrl;

        // Thin Box Geometry: width=1.6, height=2.12, depth=0.02
        const geo = new THREE.BoxGeometry(1.6, 2.12, 0.02);

        // ThreeJS Box Face Material Array: [+X, -X, +Y, -Y, +Z, -Z]
        // Front is +Z (matFront), Back is -Z (matBack), others are edges (matEdge)
        const materials = [matEdge, matEdge, matEdge, matEdge, matFront, matBack];
        const mesh = new THREE.Mesh(geo, materials);

        // Keep photo info stored in user data
        mesh.userData = {
            targetScale: 1.0,
            origPos:     new THREE.Vector3(),
            origQuat:    new THREE.Quaternion(),
            caption:     captionText,
            imageUrl:    imgUrl,
            builder:     builder,
            liked:       false,
            baseTiltX:   (Math.random() - 0.5) * 0.15,
            baseTiltY:   (Math.random() - 0.5) * 0.15,
            floatPhase:  Math.random() * Math.PI * 2,
            isFlipped:   false // tracking 3D rotation flip state
        };

        this.memoryMeshes.push(mesh);
        this.carouselGroup.add(mesh);
        return mesh;
    }

    // ─── 3D FORMATION ALGORITHMS ───
    calculateSpherePositions() {
        const n = this.memoryMeshes.length;
        if (n === 0) return;
        const radius = Math.max(6.8, 5.0 + n * 0.08);

        for (let i = 0; i < n; i++) {
            const mesh = this.memoryMeshes[i];
            const phi = Math.acos(1 - 2 * (i + 0.5) / n);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

            mesh.userData.origPos.set(
                radius * Math.cos(theta) * Math.sin(phi),
                radius * Math.cos(phi) * 0.85,
                radius * Math.sin(theta) * Math.sin(phi)
            );
            mesh.position.copy(mesh.userData.origPos);
            mesh.lookAt(0, 0, 0);

            mesh.rotateX(mesh.userData.baseTiltX);
            mesh.rotateY(mesh.userData.baseTiltY);

            mesh.userData.origQuat.copy(mesh.quaternion);
        }
    }

    calculateHeartPositions() {
        const n = this.memoryMeshes.length;
        if (n === 0) return;

        for (let i = 0; i < n; i++) {
            const mesh = this.memoryMeshes[i];
            const t = -Math.PI + (2 * Math.PI * (i + 0.5)) / n;

            const sinT = Math.sin(t);
            const xHeart = 16 * Math.pow(sinT, 3);
            const yHeart = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

            const scale = 0.28;
            const x = xHeart * scale;
            const y = (yHeart - 1.5) * scale;
            const z = Math.cos(t) * 1.2 + Math.sin(i * 1.8) * 0.4;

            mesh.userData.origPos.set(x, y, z);
            mesh.position.copy(mesh.userData.origPos);
            mesh.lookAt(x * 0.15, y * 0.15, 8.5);
            mesh.rotateX(mesh.userData.baseTiltX * 0.5);
            mesh.rotateY(mesh.userData.baseTiltY * 0.5);
            mesh.userData.origQuat.copy(mesh.quaternion);
        }
    }

    calculateSpiralPositions() {
        const n = this.memoryMeshes.length;
        if (n === 0) return;

        const radius = 5.2;
        const totalHeight = 8.5;

        for (let i = 0; i < n; i++) {
            const mesh = this.memoryMeshes[i];
            const u = n > 1 ? i / (n - 1) : 0.5;

            const y = (u - 0.5) * totalHeight;
            const theta = u * Math.PI * 5.0;

            const x = radius * Math.cos(theta);
            const z = radius * Math.sin(theta);

            mesh.userData.origPos.set(x, y, z);
            mesh.position.copy(mesh.userData.origPos);
            mesh.lookAt(x * 2.0, y, z * 2.0);
            mesh.rotateX(mesh.userData.baseTiltX * 0.4);
            mesh.rotateY(mesh.userData.baseTiltY * 0.4);
            mesh.userData.origQuat.copy(mesh.quaternion);
        }
    }

    applyCurrentLayout() {
        if (this.currentLayout === 'heart') {
            this.calculateHeartPositions();
        } else if (this.currentLayout === 'spiral') {
            this.calculateSpiralPositions();
        } else {
            this.calculateSpherePositions();
        }
    }

    setLayout(layoutName) {
        if (['sphere', 'heart', 'spiral'].indexOf(layoutName) === -1) return;
        this.currentLayout = layoutName;
        this.applyCurrentLayout();
        if (this.audio) this.audio.layoutTransitionSound();

        // Update active class on buttons
        const layoutBtns = document.querySelectorAll('[data-layout]');
        layoutBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === layoutName);
        });

        const mobBtn = document.getElementById('nav-layout-btn-mob');
        if (mobBtn) {
            const labelMap = { sphere: 'Sphere Cloud', heart: 'Heart Constellation', spiral: 'Spiral Timeline' };
            mobBtn.textContent = `🔄 3D Formation: ${labelMap[layoutName] || layoutName}`;
        }

        const titles = { sphere: 'Spherical Cloud 🌐', heart: 'Romantic Heart 💖', spiral: 'Spiral Timeline 🌀' };
        showToast(`Arranged in ${titles[layoutName] || layoutName}`, 'gold');
    }

    recalculateGlobe() {
        this.applyCurrentLayout();
    }

    // ─── ATMOSPHERE & MOOD THEMES ───
    setTheme(themeName) {
        if (['candlelit', 'midnight', 'sunset', 'vintage'].indexOf(themeName) === -1) return;
        this.currentTheme = themeName;
        document.documentElement.setAttribute('data-theme', themeName);

        const themeData = {
            candlelit: {
                ambient: 0xfff8e7,
                dir: 0xffeacc,
                point: 0xd4af37,
                bokeh: [0xd4af37, 0xdca2a8],
                label: 'Candlelit Rose 🕯️',
                overlay: 'radial-gradient(circle at center, transparent 20%, rgba(13, 11, 18, 0.6) 100%), radial-gradient(circle at 30% 20%, rgba(220, 162, 168, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 85%, rgba(212, 175, 55, 0.08) 0%, transparent 50%)'
            },
            midnight: {
                ambient: 0x9db8ff,
                dir: 0x6090ff,
                point: 0x7fe3ff,
                bokeh: [0x7fe3ff, 0xcaa6ff],
                label: 'Starlit Midnight 🌌',
                overlay: 'radial-gradient(circle at center, transparent 20%, rgba(7, 10, 22, 0.7) 100%), radial-gradient(circle at 30% 20%, rgba(127, 227, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 85%, rgba(202, 166, 255, 0.1) 0%, transparent 50%)'
            },
            sunset: {
                ambient: 0xffe0c8,
                dir: 0xff7a59,
                point: 0xffb84d,
                bokeh: [0xff7a59, 0xffb84d],
                label: 'Sunset Glow 🌅',
                overlay: 'radial-gradient(circle at center, transparent 20%, rgba(23, 11, 19, 0.65) 100%), radial-gradient(circle at 30% 20%, rgba(255, 122, 89, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 85%, rgba(255, 184, 77, 0.12) 0%, transparent 50%)'
            },
            vintage: {
                ambient: 0xf5ebd7,
                dir: 0xe0cbaf,
                point: 0xc9a063,
                bokeh: [0xc9a063, 0xa88267],
                label: 'Vintage Sepia 📜',
                overlay: 'radial-gradient(circle at center, transparent 20%, rgba(18, 14, 10, 0.7) 100%), radial-gradient(circle at 30% 20%, rgba(201, 160, 99, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 85%, rgba(168, 130, 103, 0.1) 0%, transparent 50%)'
            }
        };

        const t = themeData[themeName];
        if (t) {
            if (this.ambientLight) this.ambientLight.color.setHex(t.ambient);
            if (this.dirLight) this.dirLight.color.setHex(t.dir);
            if (this.pointLight) this.pointLight.color.setHex(t.point);

            if (this.bokehGroup) {
                this.bokehGroup.children.forEach((mesh, idx) => {
                    const c = t.bokeh[idx % t.bokeh.length];
                    if (mesh.material) mesh.material.color.setHex(c);
                });
            }

            const bgOverlay = document.getElementById('bg-overlay');
            if (bgOverlay) bgOverlay.style.background = t.overlay;

            const themeBtns = document.querySelectorAll('[data-theme]');
            themeBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === themeName);
            });

            const navThemeBtn = document.getElementById('nav-theme-btn');
            if (navThemeBtn) navThemeBtn.textContent = `🎨 ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`;
            const navThemeMob = document.getElementById('nav-theme-btn-mob');
            if (navThemeMob) navThemeMob.textContent = `🎨 Mood: ${t.label}`;

            if (this.audio) this.audio.pluck(587.33, 0.2);
            showToast(`Atmosphere: ${t.label}`, 'gold');
        }
    }

    // ─── CINEMATIC MEMORY TOUR ───
    startTour() {
        if (!this.memoryMeshes.length) return;
        this.isTouring = true;
        this.tourPaused = false;
        this.tourStartTime = Date.now();
        if (this.tourIndex < 0 || this.tourIndex >= this.memoryMeshes.length) {
            this.tourIndex = 0;
        }

        const hud = document.getElementById('tour-hud');
        if (hud) hud.style.display = 'flex';

        const pauseBtn = document.getElementById('tour-pause-btn');
        if (pauseBtn) pauseBtn.textContent = '⏸';

        this.focusTourMemory(this.tourIndex);
        showToast('Starting Cinematic Memory Tour ✨', 'gold');
    }

    focusTourMemory(index) {
        if (index < 0 || index >= this.memoryMeshes.length) return;
        this.tourIndex = index;
        this.tourStartTime = Date.now();
        const mesh = this.memoryMeshes[index];
        this.focusedMesh = mesh;
        this.focusedIndex = index;

        const counter = document.getElementById('tour-hud-counter');
        const title = document.getElementById('tour-hud-title');
        const progressFill = document.getElementById('tour-progress-fill');
        if (counter) counter.textContent = `Memory ${index + 1} of ${this.memoryMeshes.length}`;
        if (title) title.textContent = mesh.userData.caption || `Memory #${index + 1}`;
        if (progressFill) progressFill.style.width = '0%';

        if (this.audio) this.audio.tourSlideChime();
    }

    nextTourSlide() {
        if (!this.memoryMeshes.length) return;
        const nextIdx = (this.tourIndex + 1) % this.memoryMeshes.length;
        this.focusTourMemory(nextIdx);
    }

    prevTourSlide() {
        if (!this.memoryMeshes.length) return;
        const prevIdx = (this.tourIndex - 1 + this.memoryMeshes.length) % this.memoryMeshes.length;
        this.focusTourMemory(prevIdx);
    }

    togglePauseTour() {
        this.tourPaused = !this.tourPaused;
        const pauseBtn = document.getElementById('tour-pause-btn');
        if (pauseBtn) pauseBtn.textContent = this.tourPaused ? '▶️' : '⏸';
        if (!this.tourPaused) {
            this.tourStartTime = Date.now() - (this.tourProgress * this.tourSlideDuration);
        }
        showToast(this.tourPaused ? 'Tour paused' : 'Tour resumed', 'gold');
    }

    stopTour() {
        this.isTouring = false;
        this.tourPaused = false;
        const hud = document.getElementById('tour-hud');
        if (hud) hud.style.display = 'none';
        this.focusedMesh = null;
        this.focusedIndex = -1;
        showToast('Exited Cinematic Tour', 'rose');
    }

    // ─── WAX-SEALED LOVE LETTER MODAL ───
    openLoveLetterModal() {
        const modal = document.getElementById('love-letter-modal');
        const sealedView = document.getElementById('letter-sealed-view');
        const unfoldedView = document.getElementById('letter-unfolded-view');
        const editView = document.getElementById('letter-edit-view');
        const flap = document.querySelector('.envelope-flap');

        if (!modal) return;

        if (sealedView) sealedView.style.display = 'block';
        if (unfoldedView) unfoldedView.style.display = 'none';
        if (editView) editView.style.display = 'none';
        if (flap) flap.style.transform = 'none';

        const recEl = document.getElementById('letter-recipient-name');
        const authEl = document.getElementById('letter-author-name');
        if (recEl) recEl.textContent = this.targetName || 'My Love';
        if (authEl) authEl.textContent = this.creatorUsername || 'Your Secret Admirer';

        modal.style.display = 'block';
    }

    breakWaxSeal() {
        const flap = document.querySelector('.envelope-flap');
        const sealedView = document.getElementById('letter-sealed-view');
        const unfoldedView = document.getElementById('letter-unfolded-view');

        if (this.audio) this.audio.letterOpenChime();

        if (flap) flap.style.transform = 'rotateX(180deg)';

        setTimeout(() => {
            if (sealedView) sealedView.style.display = 'none';
            if (unfoldedView) unfoldedView.style.display = 'block';

            const dateEl = document.getElementById('letter-view-date');
            const salEl = document.getElementById('letter-view-salutation');
            const bodyEl = document.getElementById('letter-view-body');
            const signEl = document.getElementById('letter-view-signoff');

            if (dateEl) dateEl.textContent = this.letterDate || 'Forever & Always';
            if (salEl) salEl.textContent = `Dearest ${this.targetName || 'One'},`;

            const defaultLetter = "Every moment with you feels like catching starlight in a jar. Through every laugh, every quiet evening, and every step along our path, you make ordinary days feel extraordinary.\n\nThank you for being my favorite memory, today and every tomorrow.";
            const rawBody = (this.letterText && this.letterText.trim()) ? this.letterText : defaultLetter;
            if (bodyEl) bodyEl.innerHTML = rawBody.replace(/\n/g, '<br>');

            if (signEl) signEl.textContent = `With all my heart, ${this.creatorUsername || 'Your Secret Admirer'} ❤️`;

            const editBtn = document.getElementById('letter-edit-btn');
            if (editBtn) editBtn.style.display = 'inline-block';
        }, 550);
    }

    // Rebuild texture when caption text gets updated
    updatePolaroidCaption(mesh, text) {
        if (!mesh) return;
        mesh.userData.caption = text;
        
        // Reload texture with new handwritten string
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            mesh.material.map = mesh.userData.builder.createTexture(img, text);
            mesh.material.needsUpdate = true;
        };
        img.src = mesh.userData.imageUrl;
    }

    /* ──────────────────────────────────────────
       GOLDEN HAND CURSOR POINT (soft spark)
    ────────────────────────────────────────── */
    initHandCursor() {
        const geom = new THREE.SphereGeometry(0.12, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xd4af37,
            transparent: true,
            opacity: 0.95
        });
        this.handMarker = new THREE.Mesh(geom, mat);
        this.handMarker.visible = false;

        // Warm candlelight glow point
        const light = new THREE.PointLight(0xffeaad, 3.5, 8);
        this.handMarker.add(light);
        this.scene.add(this.handMarker);

        // Hand trail spark coordinates
        this.trailPoints = [];
        this.MAX_TRAIL_POINTS = 20;

        const trailGeom = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(this.MAX_TRAIL_POINTS * 3);
        trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeom.setDrawRange(0, 0);

        const cv = document.createElement('canvas');
        cv.width = cv.height = 32;
        const cx = cv.getContext('2d');
        const gr = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, 'rgba(212,175,55,0.7)');
        gr.addColorStop(1, 'rgba(212,175,55,0)');
        cx.fillStyle = gr;
        cx.fillRect(0,0,32,32);

        const trailMat = new THREE.PointsMaterial({
            size: 0.15,
            map: new THREE.CanvasTexture(cv),
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.trailMesh = new THREE.Points(trailGeom, trailMat);
        this.scene.add(this.trailMesh);
    }

    _updateTrail(pos) {
        this.trailPoints.unshift({x: pos.x, y: pos.y, z: pos.z});
        if (this.trailPoints.length > this.MAX_TRAIL_POINTS) this.trailPoints.pop();

        const arr = this.trailMesh.geometry.attributes.position.array;
        for (let i = 0; i < this.trailPoints.length; i++) {
            arr[i*3]   = this.trailPoints[i].x;
            arr[i*3+1] = this.trailPoints[i].y;
            arr[i*3+2] = this.trailPoints[i].z;
        }
        this.trailMesh.geometry.setDrawRange(0, this.trailPoints.length);
        this.trailMesh.geometry.attributes.position.needsUpdate = true;
    }

    _clearTrail() {
        this.trailPoints = [];
        this.trailMesh.geometry.setDrawRange(0, 0);
    }

    /* ──────────────────────────────────────────
       RESIZE WINDOW
    ────────────────────────────────────────── */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        if (this.fwCanvas) {
            this.fwCanvas.width = window.innerWidth;
            this.fwCanvas.height = window.innerHeight;
        }
        
        // Adjust camera distance for mobile vertical screen sizes
        if (window.innerWidth < 768) {
            this.camera.position.z = Math.max(11, this.camera.position.z);
        }
    }

    /* ──────────────────────────────────────────
       MOBILE TOUCH GESTURES FALLBACK
    ────────────────────────────────────────── */
    initTouchControls() {
        this.touchStartPos = new THREE.Vector2();
        this.touchStartDist = 0;
        this.isTouchPanning = false;
        this.isTouchZooming = false;
        this.hasMovedTouch = false;

        const dom = this.renderer.domElement;

        dom.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isTouchPanning = true;
                this.isTouchZooming = false;
                this.hasMovedTouch = false;
                this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
            } else if (e.touches.length === 2) {
                this.isTouchPanning = false;
                this.isTouchZooming = true;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.touchStartDist = Math.sqrt(dx*dx + dy*dy);
            }
        }, { passive: true });

        dom.addEventListener('touchmove', (e) => {
            if (this.isTouchPanning && e.touches.length === 1) {
                const dx = e.touches[0].clientX - this.touchStartPos.x;
                const dy = e.touches[0].clientY - this.touchStartPos.y;

                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    this.hasMovedTouch = true;
                }

                if (!this.focusedMesh) {
                    // Rotate the globe
                    this.targetRotationY += dx * 0.0055;
                    this.targetRotationX += dy * 0.0055;
                } else {
                    // Drag focused photo slightly
                    this.focusedMesh.position.x += dx * 0.005;
                    this.focusedMesh.position.y -= dy * 0.005;
                }

                this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
            } else if (this.isTouchZooming && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx*dx + dy*dy);

                const deltaDist = dist - this.touchStartDist;
                this.camera.position.z -= deltaDist * 0.015;
                this.camera.position.z = Math.max(3, Math.min(18, this.camera.position.z));

                this.touchStartDist = dist;
            }
        }, { passive: true });

        dom.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                if (this.isTouchPanning && !this.hasMovedTouch) {
                    // It was a quick, stationary tap (selection/unfocus raycast)
                    const touch = e.changedTouches[0];
                    this.handleTap(touch.clientX, touch.clientY);
                }
                this.isTouchPanning = false;
                this.isTouchZooming = false;
            }
        });
    }

    handleTap(clientX, clientY) {
        const mouse = new THREE.Vector2();
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const intersects = raycaster.intersectObjects(this.memoryMeshes);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            
            if (this.focusedMesh === clickedMesh) {
                // Toggle card flip state if they tap the already focused card
                clickedMesh.userData.isFlipped = !clickedMesh.userData.isFlipped;
                this.audio.pluck(659.25, 0.25);
                showToast(clickedMesh.userData.isFlipped ? 'Flipped to back of photo 📝' : 'Flipped to front 📸', 'gold');
            } else {
                // Focus the card, resetting any flips
                if (this.focusedMesh) this.focusedMesh.userData.isFlipped = false;
                this.focusedMesh = clickedMesh;
                this.focusedMesh.userData.isFlipped = false;
                this.focusedIndex = this.memoryMeshes.indexOf(clickedMesh);
                this.audio.pluck(523.25, 0.35);
                showToast('Selected memory card', 'gold');
            }
        } else {
            // Tapping background empty space releases focus
            if (this.focusedMesh) {
                this.focusedMesh.userData.isFlipped = false;
                this.focusedMesh = null;
                this.audio.pluck(293.66, 0.2);
                showToast('Returned photo to box', 'rose');
            }
        }
    }

    /* ══════════════════════════════════════════
       RENDER TICK
    ══════════════════════════════════════════ */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // 1. Move dust motes and bokeh embers
        if (this.bokehGroup) {
            this.bokehGroup.children.forEach(mesh => {
                mesh.position.x += mesh.userData.driftSpeedX;
                mesh.position.y += mesh.userData.driftSpeedY;
                
                // Keep inside boundaries
                if (Math.abs(mesh.position.x) > 18) mesh.position.x *= -0.9;
                if (Math.abs(mesh.position.y) > 12) mesh.position.y *= -0.9;

                // Gentle pulsing opacity
                mesh.material.opacity = 0.05 + Math.sin(elapsedTime * mesh.userData.pulseSpeed + mesh.userData.phase) * 0.08;
            });
        }

        if (this.dustPoints) {
            const pos = this.dustPoints.geometry.attributes.position.array;
            for (let i = 0; i < pos.length / 3; i++) {
                pos[i*3+1] -= 0.015; // fall slowly
                pos[i*3]   += Math.sin(elapsedTime * 0.3 + i) * 0.005; // drift side to side
                if (pos[i*3+1] < -10) pos[i*3+1] = 10;
            }
            this.dustPoints.geometry.attributes.position.needsUpdate = true;
        }

        // 2. Slow natural floating/rotation on the polaroids group
        const handActive = this.handMarker && this.handMarker.visible;
        if (!handActive && !this.focusedMesh && !this.isExploding) {
            this.idleTimer += delta;
            if (this.idleTimer > 1.5) {
                // gentle idle spin
                this.targetRotationY += 0.0015;
            }
        } else {
            this.idleTimer = 0;
        }

        // Apply carousel rotations with physical inertial momentum
        if (this.carouselGroup && !this.focusedMesh && !this.isExploding) {
            this.targetRotationY += this.rotVelY;
            this.targetRotationX += this.rotVelX;
            this.rotVelY *= 0.92;
            this.rotVelX *= 0.92;

            // Pitch limit to avoid disorientation
            this.targetRotationX = Math.max(-0.6, Math.min(0.6, this.targetRotationX));

            const damp = Math.min(1.0, delta * 5.0);
            this.carouselGroup.rotation.y += (this.targetRotationY - this.carouselGroup.rotation.y) * damp;
            this.carouselGroup.rotation.x += (this.targetRotationX - this.carouselGroup.rotation.x) * damp;
        }

        // 3. Blast explosion physics on magical gesture trigger
        if (this.isExploding && this.meshVelocities.length) {
            this.memoryMeshes.forEach((mesh, i) => {
                const vel = this.meshVelocities[i];
                if (vel) {
                    mesh.position.add(vel);
                    vel.multiplyScalar(0.965); // drag
                    mesh.rotation.x += 0.02;
                    mesh.rotation.y += 0.015;
                }
            });
        }

        // 4. Polaroid Hover Scale & Focus Lerp (Zero-GC)
        if (!this.focusedMesh) {
            let closestMesh = null, closestDist = 3.2;

            if (this.handMarker.visible) {
                this.handMarker.getWorldPosition(this._tmpVec1);
                this.memoryMeshes.forEach(mesh => {
                    mesh.getWorldPosition(this._tmpVec2);
                    if (this._tmpVec2.z > 1.5) {
                        const dist = Math.hypot(this._tmpVec1.x - this._tmpVec2.x, this._tmpVec1.y - this._tmpVec2.y);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestMesh = mesh;
                        }
                    }
                });
            }

            if (!this.hoveredMesh || !this.handMarker.visible) {
                this.hoveredMesh = closestMesh;
            }

            this.memoryMeshes.forEach(mesh => {
                const isHovered = (mesh === this.hoveredMesh);
                mesh.userData.targetScale = isHovered ? 1.25 : 1.0;
                
                const s = (mesh.userData.targetScale - mesh.scale.x) * Math.min(1.0, delta * 8.0);
                mesh.scale.addScalar(s);
                
                // Harmonized organic floating wave and position return
                this._tmpTargetPos.copy(mesh.userData.origPos);
                this._tmpTargetPos.y += Math.sin(elapsedTime * 0.8 + mesh.userData.floatPhase) * 0.08;
                mesh.position.lerp(this._tmpTargetPos, Math.min(1.0, delta * 5.0));
                mesh.quaternion.slerp(mesh.userData.origQuat, Math.min(1.0, delta * 5.0));
            });
        } else {
            // Focus Mode: Dim all other cards
            this.memoryMeshes.forEach(mesh => {
                if (mesh !== this.focusedMesh) {
                    mesh.userData.targetScale = 0.85;
                    const s = (mesh.userData.targetScale - mesh.scale.x) * Math.min(1.0, delta * 6.0);
                    mesh.scale.addScalar(s);
                    this._tmpTargetPos.copy(mesh.userData.origPos);
                    this._tmpTargetPos.y += Math.sin(elapsedTime * 0.8 + mesh.userData.floatPhase) * 0.08;
                    mesh.position.lerp(this._tmpTargetPos, Math.min(1.0, delta * 5.0));
                    mesh.quaternion.slerp(mesh.userData.origQuat, Math.min(1.0, delta * 5.0));
                }
            });

            // Bring focused card smoothly in front of the camera (Zero-GC)
            this._tmpVec1.copy(this.camera.position).add(new THREE.Vector3(0, -0.2, -2.5));
            this.carouselGroup.worldToLocal(this._tmpVec1);
            this.focusedMesh.position.lerp(this._tmpVec1, Math.min(1.0, delta * 6.5));

            this._tmpCurQ.copy(this.focusedMesh.quaternion);
            this._tmpVec2.copy(this.camera.position);
            this.carouselGroup.worldToLocal(this._tmpVec2);
            this.focusedMesh.lookAt(this._tmpVec2);
            if (this.focusedMesh.userData.isFlipped) {
                this.focusedMesh.rotateY(Math.PI);
            }
            this._tmpTgtQ.copy(this.focusedMesh.quaternion);
            this.focusedMesh.quaternion.copy(this._tmpCurQ).slerp(this._tmpTgtQ, Math.min(1.0, delta * 6.5));

            const sc = (2.2 - this.focusedMesh.scale.x) * Math.min(1.0, delta * 6.0);
            this.focusedMesh.scale.addScalar(sc);
        }

        // 5. Update caption panel text if focused card changes
        if (this.focusedMesh !== this.lastFocusedMesh) {
            // Reset flipped state of the previous focused card
            if (this.lastFocusedMesh) {
                this.lastFocusedMesh.userData.isFlipped = false;
            }

            const panel = document.getElementById('caption-panel');
            const input = document.getElementById('caption-input');
            if (this.focusedMesh) {
                if (panel) panel.style.display = 'block';
                if (input) input.value = this.focusedMesh.userData.caption || '';
            } else {
                if (panel) panel.style.display = 'none';
            }
            this.lastFocusedMesh = this.focusedMesh;
        }

        // 6. Tour slide progress timer
        if (this.isTouring && !this.tourPaused) {
            const elapsedSlide = Date.now() - this.tourStartTime;
            this.tourProgress = Math.min(1.0, elapsedSlide / this.tourSlideDuration);
            const fill = document.getElementById('tour-progress-fill');
            if (fill) fill.style.width = `${(this.tourProgress * 100).toFixed(1)}%`;

            if (this.tourProgress >= 1.0) {
                this.nextTourSlide();
            }
        }

        this.composer.render();
    }

    /* ──────────────────────────────────────────
       MAGICAL EXPLOSION BURST
    ────────────────────────────────────────── */
    triggerExplosion() {
        if (this.isExploding) return;
        this.isExploding = true;
        this.focusedMesh = null;

        // Accelerate background dust speeds
        this.meshVelocities = this.memoryMeshes.map(() => new THREE.Vector3(
            (Math.random() - 0.5) * 0.45,
            (Math.random() - 0.5) * 0.45,
            (Math.random() - 0.5) * 0.45
        ));

        const overlay = document.getElementById('love-overlay');
        if (overlay) overlay.classList.add('visible');

        this.startFireworks();
        this.audio.magicFanfare();

        clearTimeout(this.explosionTimer);
        this.explosionTimer = setTimeout(() => this.resetExplosion(), 5000);
    }

    resetExplosion() {
        this.isExploding = false;
        this.meshVelocities = [];
        const overlay = document.getElementById('love-overlay');
        if (overlay) overlay.classList.remove('visible');
        this.stopFireworks();
    }

    /* ──────────────────────────────────────────
       GESTURES CONTROLLER
    ────────────────────────────────────────── */
    handleGesture(data) {
        if (!data || data.type === 'none') {
            this.handMarker.visible = false;
            this._updateGestureLabel('—');
            this._updateConfidence(0);
            this._clearTrail();
            return;
        }

        this._updateGestureLabel(data.type);
        this._updateConfidence(data.confidence !== undefined ? data.confidence : 95);

        // Normalized Device Coordinates (NDC) for perspective projection
        // With mirrored webcam view: mirror X is -(x - 0.5) * 2 and Y is -(y - 0.5) * 2
        const ndcX = -(data.position.x - 0.5) * 2;
        const ndcY = -(data.position.y - 0.5) * 2;
        const ndc = new THREE.Vector2(ndcX, ndcY);

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, this.camera);

        // Place hand marker along ray dynamically in front of camera (always visible at any zoom)
        const markerDist = Math.max(2.0, Math.min(3.5, this.camera.position.z - 1.0));
        const targetMarkerPos = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(markerDist));

        // Two hands interaction: zoom/scale
        if (data.type === 'two_hands_zoom') {
            this.handMarker.visible = true;
            this.handMarker.position.lerp(targetMarkerPos, 0.4);

            if (data.zoomDelta) {
                this.camera.position.z -= data.zoomDelta * 6.0;
                this.camera.position.z  = Math.max(3, Math.min(18, this.camera.position.z));
            }
            return;
        }

        // Two pinch magical scaling
        if (data.type === 'magic_wand') {
            this.handMarker.visible = true;
            this.handMarker.position.lerp(targetMarkerPos, 0.4);
            
            if (data.position && data.position2) {
                const dx = (data.position.x - data.position2.x) * 10;
                const dy = (data.position.y - data.position2.y) * 10;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ts = Math.max(0.4, Math.min(dist * 0.35, 2.5));
                this.carouselGroup.scale.lerp(new THREE.Vector3(ts, ts, ts), 0.1);
            }
            return;
        }

        // Single hand cursor move
        this.handMarker.visible = true;
        this.handMarker.position.lerp(targetMarkerPos, 0.4);
        this._updateTrail(this.handMarker.position);

        // Raycast against memory meshes to detect hovered photo directly under cursor
        const intersects = raycaster.intersectObjects(this.memoryMeshes);
        if (intersects.length > 0 && !this.focusedMesh) {
            this.hoveredMesh = intersects[0].object;
        }

        const type = data.type;
        const now = Date.now();

        // ─── FOCUSED CARD MODE ───
        if (this.focusedMesh) {
            if (type === 'open_palm' && (data.deltaX || data.deltaY)) {
                // Swipe away release
                if (Math.abs(data.deltaX) > 0.07 || Math.abs(data.deltaY) > 0.07) {
                    this.focusedMesh.userData.isFlipped = false;
                    this.focusedMesh = null;
                    showToast('Returned photo to box', 'rose');
                    this.audio.pluck(293.66, 0.2); // sweet chime down
                    return;
                }
                // Drag slightly
                this.focusedMesh.position.x -= data.deltaX * 8.0;
                this.focusedMesh.position.y -= data.deltaY * 8.0;
            }
            if (type === 'peace') {
                if (now - this._lastPeaceTime > 750) {
                    this._lastPeaceTime = now;
                    this.focusedMesh.userData.isFlipped = false;
                    this.focusedMesh = null;
                    showToast('Put photo back', 'gold');
                    this.audio.pluck(293.66, 0.2);
                }
                return;
            }
            if (type === 'pinch') {
                if (now - this._lastPinchTime > 750) {
                    this._lastPinchTime = now;
                    this.focusedMesh.userData.isFlipped = !this.focusedMesh.userData.isFlipped;
                    this.audio.pluck(659.25, 0.25);
                    showToast(this.focusedMesh.userData.isFlipped ? 'Flipped to back of photo 📝' : 'Flipped to front 📸', 'gold');
                }
                return;
            }
            if (type === 'thumbs_up' && !this.focusedMesh.userData.liked) {
                this.focusedMesh.userData.liked = true;
                this.showLike();
                return;
            }
            if (type === 'ok_sign') {
                if (now - this._lastScreenshotTime > 1500) {
                    this._lastScreenshotTime = now;
                    this.takeScreenshot();
                }
                return;
            }
            return;
        }

        // ─── BROWSING MODE ───

        // General rotation via Open Palm with inertia
        if (type === 'open_palm' && (data.deltaX || data.deltaY)) {
            this.targetRotationY -= data.deltaX * 3.5;
            this.targetRotationX -= data.deltaY * 3.5;
            this.rotVelY = -data.deltaX * 5.0;
            this.rotVelX = -data.deltaY * 5.0;
        }

        // Pinch selection (debounced)
        if (type === 'pinch' && !this.focusedMesh) {
            const meshToSelect = this.hoveredMesh || (intersects.length > 0 ? intersects[0].object : null);
            if (meshToSelect && (now - this._lastPinchTime > 750)) {
                this._lastPinchTime = now;
                this.focusedMesh = meshToSelect;
                this.focusedMesh.userData.isFlipped = false;
                this.focusedIndex = this.memoryMeshes.indexOf(meshToSelect);
                this.audio.pluck(523.25, 0.35); // clear box click-bell
                showToast('Selected memory card', 'gold');
            }
        }

        // Next/Prev navigator (debounced to advance one photo per gesture)
        if (type === 'point_up' && this.memoryMeshes.length > 0) {
            if (now - this._lastNavTime > 650) {
                this._lastNavTime = now;
                this.focusedIndex = (this.focusedIndex + 1) % this.memoryMeshes.length;
                this.focusedMesh = this.memoryMeshes[this.focusedIndex];
                if (this.focusedMesh) this.focusedMesh.userData.isFlipped = false;
                this.audio.pluck(587.33, 0.22);
                showToast('Next photo', 'gold');
            }
        }
        if (type === 'point_down' && this.memoryMeshes.length > 0) {
            if (now - this._lastNavTime > 650) {
                this._lastNavTime = now;
                this.focusedIndex = (this.focusedIndex - 1 + this.memoryMeshes.length) % this.memoryMeshes.length;
                this.focusedMesh = this.memoryMeshes[this.focusedIndex];
                if (this.focusedMesh) this.focusedMesh.userData.isFlipped = false;
                this.audio.pluck(392.00, 0.22);
                showToast('Previous photo', 'gold');
            }
        }

        // Magical love fanfare (debounced)
        if (type === 'love') {
            if (now - this._lastLoveTime > 2000) {
                this._lastLoveTime = now;
                this.triggerExplosion();
            }
        }

        // OK Sign: Capture screenshot (debounced)
        if (type === 'ok_sign') {
            if (now - this._lastScreenshotTime > 1500) {
                this._lastScreenshotTime = now;
                this.takeScreenshot();
            }
        }

        // Gentle rotate on thumbs up / thumbs down
        if (type === 'thumbs_up') {
            this.targetRotationY += 0.04;
        }
        if (type === 'thumbs_down') {
            this.targetRotationY -= 0.04;
        }

        // Shake camera slightly on shaka
        if (type === 'call_me') {
            this.camera.position.x = (Math.random() - 0.5) * 0.3;
            this.camera.position.y = (Math.random() - 0.5) * 0.3;
        } else {
            this.camera.position.x += (0 - this.camera.position.x) * 0.1;
            this.camera.position.y += (0 - this.camera.position.y) * 0.1;
        }
    }

    showLike() {
        const el = document.getElementById('like-burst');
        if (!el) return;
        el.classList.remove('show');
        void el.offsetWidth;
        el.classList.add('show');
        showToast('Liked memory ❤️', 'rose');
        this.audio.pluck(783.99, 0.3); // High heart pluck
    }

    takeScreenshot() {
        try {
            this.renderer.render(this.scene, this.camera);
            const dataURL = this.renderer.domElement.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `scrapbook_snapshot_${Date.now()}.png`;
            a.click();
            showToast('Saved screenshot to device 📸', 'gold');
            this.audio.shutter();
        } catch (e) {
            showToast('Failed to save screenshot', 'rose');
        }
    }

    /* ──────────────────────────────────────────
       SMILE DETECTION & ROMANTIC COMPLIMENTS (WITH RIZZ)
    ────────────────────────────────────────── */
    showCompliment() {
        if (!this.compliments || this.compliments.length === 0) return;

        let index = Math.floor(Math.random() * this.compliments.length);
        if (index === this._lastComplimentIndex && this.compliments.length > 1) {
            index = (index + 1) % this.compliments.length;
        }
        this._lastComplimentIndex = index;
        const compliment = this.compliments[index];

        // 1. Play warm chime chord
        if (this.audio) {
            this.audio.pluck(523.25, 0.25);
            setTimeout(() => this.audio.pluck(659.25, 0.3), 120);
            setTimeout(() => this.audio.pluck(783.99, 0.35), 240);
        }

        // 2. Heart burst animation
        const el = document.getElementById('like-burst');
        if (el) {
            el.classList.remove('show');
            void el.offsetWidth;
            el.classList.add('show');
        }

        // 3. Update gesture label
        this._updateGestureLabel('smile');
        setTimeout(() => {
            this._updateGestureLabel('—');
        }, 3200);

        // 4. Show romantic compliment overlay & toast
        const overlay = document.getElementById('compliment-overlay');
        const compText = document.getElementById('compliment-text');
        if (overlay && compText) {
            compText.textContent = compliment;
            overlay.style.display = 'block';
            overlay.style.opacity = '1';
            overlay.style.transition = 'opacity 0.6s ease';
            clearTimeout(this._complimentTimer);
            this._complimentTimer = setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 650);
            }, 4500);
        }
        showToast(compliment, 'gold', 6500);

        // 5. Speak warmly via SpeechSynthesis
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
                // Strip emoji glyphs for natural speech pronunciation
                const spokenText = compliment.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                const utt = new SpeechSynthesisUtterance(spokenText);
                utt.rate = 0.88;
                utt.pitch = 1.05;
                utt.volume = 0.95;

                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    const naturalVoice = voices.find(v => 
                        v.lang.startsWith('en') && 
                        (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.name.includes('Google US English') || v.name.includes('Victoria'))
                    );
                    if (naturalVoice) utt.voice = naturalVoice;
                }
                window.speechSynthesis.speak(utt);
            } catch (err) {
                console.warn('Speech synthesis notice:', err);
            }
        }
    }

    /* ──────────────────────────────────────────
       SOFT MAGICAL SPARKLES (Replacing harsh fireworks)
    ────────────────────────────────────────── */
    initFireworks() {
        this.fwCanvas = document.getElementById('fireworks-canvas');
        if (!this.fwCanvas) return;
        this.fwCanvas.width = window.innerWidth;
        this.fwCanvas.height = window.innerHeight;
        this.fwCtx = this.fwCanvas.getContext('2d');
        this.fwParticles = [];
        this.fwRunning = false;
    }

    startFireworks() {
        if (!this.fwCanvas) return;
        this.fwCanvas.style.display = 'block';
        this.fwRunning = true;
        this.fwParticles = [];
        this._fwLoop();
    }

    stopFireworks() {
        this.fwRunning = false;
        if (this.fwCanvas) this.fwCanvas.style.display = 'none';
    }

    _fwLoop() {
        if (!this.fwRunning) return;
        const ctx = this.fwCtx;
        const W = this.fwCanvas.width, H = this.fwCanvas.height;

        ctx.fillStyle = 'rgba(13, 11, 18, 0.18)';
        ctx.fillRect(0, 0, W, H);

        // Spawn gold and rose dust bursts
        if (Math.random() < 0.2) {
            const cx = Math.random() * W;
            const cy = Math.random() * H * 0.5 + 50;
            const color = Math.random() > 0.5 ? '#d4af37' : '#dca2a8';
            const count = 50 + Math.floor(Math.random() * 40);
            
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const speed = 1.5 + Math.random() * 4.5;
                this.fwParticles.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0,
                    decay: 0.015 + Math.random() * 0.015,
                    color,
                    size: 1.5 + Math.random() * 2
                });
            }
        }

        this.fwParticles = this.fwParticles.filter(p => p.life > 0);
        for (const p of this.fwParticles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();

            p.x  += p.vx;
            p.y  += p.vy;
            p.vy += 0.04; // low gravity
            p.vx *= 0.985;
            p.life -= p.decay;
        }
        ctx.globalAlpha = 1;
        
        if (this.fwRunning) {
            requestAnimationFrame(() => this._fwLoop());
        }
    }

    /* ──────────────────────────────────────────
       UI LABEL CONVERSIONS
    ────────────────────────────────────────── */
    _updateGestureLabel(type) {
        const el = document.getElementById('gesture-label');
        if (!el) return;
        const map = {
            'open_palm':      '✋ Spinning Album',
            'pinch':          '🤏 Holding Photo',
            'peace':          '✌️ Releasing',
            'fist':           '✊ Pause',
            'love':           '🤟 Magical Burst',
            'thumbs_up':      '👍 Like Photo',
            'thumbs_down':    '👎 Fast Rotate Backward',
            'ok_sign':        '👌 Capture Screen',
            'call_me':        '🤙 Shaking Screen',
            'four_fingers':   '🖐️ Gentle Air Float',
            'two_hands_zoom': '👐 Floating Closer/Away',
            'magic_wand':     '🪄 Scaling Album',
            'point_up':       '☝️ Next Polaroid',
            'point_down':     '👇 Previous Polaroid',
            'smile':          '😊 Smile Detected 💕',
            '—':              '— Ready'
        };
        el.textContent = map[type] || ('🖐 ' + type);
        el.classList.toggle('active', type !== '—');
    }

    _updateConfidence(pct) {
        const bar = document.getElementById('confidence-bar');
        if (bar) bar.style.width = pct + '%';
    }

    _updatePhotoCounter() {
        const el = document.getElementById('photo-count-num');
        if (el) el.textContent = this.memoryMeshes.length;
    }

    /* ══════════════════════════════════════════
       CAMERA & HAND TRACKER TOGGLE
    ══════════════════════════════════════════ */
    async toggleCamera() {
        const videoEl = document.getElementById('input-video');
        const webcamDisplay = document.getElementById('webcam-display');
        const cameraToggleBtn = document.getElementById('camera-toggle-btn');
        const navCameraBtn = document.getElementById('nav-camera-btn');
        const navCameraBtnMob = document.getElementById('nav-camera-btn-mob');
        const toggleTechBtn = document.getElementById('toggle-tech-btn');

        const updateCameraButtons = (isActive) => {
            if (cameraToggleBtn) {
                cameraToggleBtn.textContent = isActive ? '📷 Hand Camera: Active 🟢' : '📷 Hand Camera: Start';
                cameraToggleBtn.classList.toggle('camera-active', isActive);
            }
            if (navCameraBtn) {
                navCameraBtn.textContent = isActive ? '📷 Camera On' : '📷 Camera';
                navCameraBtn.classList.toggle('camera-active', isActive);
            }
            if (navCameraBtnMob) {
                navCameraBtnMob.textContent = isActive ? '📷 Camera: Active 🟢' : '📷 Camera Control';
                navCameraBtnMob.classList.toggle('camera-active', isActive);
            }
            if (toggleTechBtn) {
                toggleTechBtn.style.display = isActive ? 'inline-block' : 'none';
            }
        };

        if (this.tracker && this.tracker.isActive()) {
            this.tracker.stop();
            if (webcamDisplay) {
                webcamDisplay.srcObject = null;
            }
            updateCameraButtons(false);
            showToast('📷 Camera turned off. Touch/Mouse Mode active 📱', 'gold');
            return false;
        }

        if (!this.tracker) {
            this.tracker = new HandTracker(
                videoEl,
                this.handleGesture.bind(this),
                (ratio) => {
                    const now = Date.now();
                    if (now - this.lastSmileTime > 4000) {
                        this.lastSmileTime = now;
                        console.log("😊 Smile detected! Ratio:", ratio);
                        this.showCompliment();
                    }
                }
            );
        }

        try {
            await this.tracker.start();

            if (webcamDisplay && videoEl) {
                webcamDisplay.srcObject = videoEl.srcObject;
                webcamDisplay.play().catch(() => {});
            }

            updateCameraButtons(true);
            showToast('📷 Camera connected! Wave or pinch 🌹', 'gold', 3500);

            // If loading screen is still active, dismiss it smoothly
            const screen = document.getElementById('loading-screen');
            if (screen && screen.style.display !== 'none') {
                screen.style.transition = 'opacity 0.8s';
                screen.style.opacity = '0';
                setTimeout(() => { screen.style.display = 'none'; }, 820);
                const cp = document.getElementById('control-panel');
                if (cp) cp.style.display = 'block';
            }

            return true;
        } catch (err) {
            console.warn('Camera/hand tracking blocked or unavailable. Touch Mode active 📱', err);
            updateCameraButtons(false);
            showToast('Camera access blocked. Touch Mode active 📱', 'rose', 4000);
            return false;
        }
    }

    /* ══════════════════════════════════════════
       UI PAGE LIFECYCLE CONTROLS
    ══════════════════════════════════════════ */
    uiSetup() {
        const btnYes    = document.getElementById('btn-yes');
        const btnNo     = document.getElementById('btn-no');
        const statusText= document.getElementById('status-text');

        // Toggle Technical Drawer
        const toggleTechBtn = document.getElementById('toggle-tech-btn');
        const techDrawer = document.getElementById('tech-drawer');
        if (toggleTechBtn && techDrawer) {
            toggleTechBtn.addEventListener('click', () => {
                techDrawer.classList.toggle('open');
                toggleTechBtn.textContent = techDrawer.classList.contains('open') ? '⚙️ Hide Camera' : '⚙️ Align Camera';
            });
        }

        // NO Button sob looping
        let noCount = 0;
        const MAX_NO = 9;

        const handleNo = () => {
            if (noCount >= MAX_NO) return;
            noCount++;
            btnYes.disabled = btnNo.disabled = true;
            this.audio.sob();

            if (this.targetName && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utt = new SpeechSynthesisUtterance(`Please, ${this.targetName}!`);
                utt.rate = 0.8; utt.pitch = 0.7;
                window.speechSynthesis.speak(utt);
            }

            // Wobble
            const q = document.getElementById('love-question');
            if (q) {
                q.style.transition = 'transform 0.1s';
                q.style.transform = 'translateX(-8px) rotate(-1.5deg)';
                setTimeout(() => { q.style.transform = 'translateX(8px) rotate(1.5deg)'; }, 150);
                setTimeout(() => { q.style.transform = 'none'; }, 300);
            }

            const shrink = 1 - noCount * 0.09;
            const grow   = 1 + noCount * 0.12;
            btnNo.style.transform = `scale(${Math.max(shrink, 0.05)})`;
            btnNo.style.opacity = `${Math.max(shrink, 0.05)}`;
            btnYes.style.transform = `scale(${Math.min(grow, 2.2)})`;

            setTimeout(() => {
                if (noCount >= MAX_NO) {
                    btnNo.style.display = 'none';
                    btnYes.style.transform = 'scale(2.0)';
                    btnYes.style.boxShadow = '0 10px 40px rgba(220,162,168,0.4)';
                    btnYes.disabled = false;
                    if (q) q.innerText = '🌻 Take a look inside first...';
                } else {
                    btnYes.disabled = btnNo.disabled = false;
                }
            }, 2400);
        };
        btnNo.addEventListener('click', handleNo);

        // YES Button
        const handleYes = async () => {
            btnYes.disabled = btnNo.disabled = true;
            const q = document.getElementById('love-question');
            if (q) q.innerText = '🌹 Opening...';
            if (statusText) {
                statusText.style.display = 'block';
                statusText.innerText = 'Lighting the candles...';
            }

            // Try starting camera and hand tracker
            await this.toggleCamera();

            // ─── INITIALIZE 3D GRAPHICS & CONTROLS ANYWAY ───
            
            // Smooth fade loading screen
            const screen = document.getElementById('loading-screen');
            if (screen) {
                screen.style.transition = 'opacity 0.8s';
                screen.style.opacity = '0';
                setTimeout(() => { screen.style.display = 'none'; }, 820);
            }

            // Show clean memory panel
            const cp = document.getElementById('control-panel');
            if (cp) cp.style.display = 'block';

            // Minimize controls
            const minBtn = document.getElementById('minimize-btn');
            if (cp && minBtn) {
                minBtn.addEventListener('click', () => {
                    cp.classList.toggle('minimized');
                    minBtn.textContent = cp.classList.contains('minimized') ? '+' : '−';
                });
            }

            // Camera toggle button in control panel
            const cameraToggleBtn = document.getElementById('camera-toggle-btn');
            if (cameraToggleBtn) {
                cameraToggleBtn.addEventListener('click', () => {
                    this.toggleCamera();
                });
            }

            // Sweet Compliment button
            const complimentBtn = document.getElementById('compliment-btn');
            if (complimentBtn) {
                complimentBtn.addEventListener('click', () => {
                    this.showCompliment();
                });
            }

            // Music Box sound toggle
            const audioBtn = document.getElementById('audio-toggle-btn');
            if (audioBtn) {
                this.audio.enabled = true;
                this.audio.startMelody();
                audioBtn.textContent = '🔊 Music Box: On';
                audioBtn.classList.add('active');
                const indicator = document.getElementById('audio-indicator');
                if (indicator) indicator.classList.add('visible');

                audioBtn.addEventListener('click', () => {
                    this.audio.enabled = !this.audio.enabled;
                    if (this.audio.enabled) {
                        this.audio.startMelody();
                        audioBtn.textContent = '🔊 Music Box: On';
                        audioBtn.classList.add('active');
                        if (indicator) indicator.classList.add('visible');
                        showToast('Wind chimes & notes active', 'gold');
                    } else {
                        this.audio.stopMelody();
                        audioBtn.textContent = '🔇 Music Box: Off';
                        audioBtn.classList.remove('active');
                        if (indicator) indicator.classList.remove('visible');
                    }
                });
            }

            // Photos add
            const fileInput = document.getElementById('photo-upload');
            const uploadBtn = document.getElementById('add-photo-btn');
            const targetNameInp = document.getElementById('target-name-input');
            const shareBtn = document.getElementById('share-gallery-btn');
            const shareModal = document.getElementById('share-modal');
            const shareLinkInput = document.getElementById('share-link-input');
            const copyLinkBtn = document.getElementById('copy-link-btn');
            const closeShareBtn = document.getElementById('close-share-modal-btn');

            this.pendingUploads = [];

            if (fileInput && uploadBtn) {
                uploadBtn.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', e => {
                    const files = e.target.files;
                    if (!files.length) return;

                    if (!this.hasUserPhotos) {
                        this.hasUserPhotos = true;
                        this.memoryMeshes.forEach(mesh => {
                            this.carouselGroup.remove(mesh);
                            mesh.geometry.dispose();
                            if (mesh.material.map) mesh.material.map.dispose();
                            mesh.material.dispose();
                        });
                        this.memoryMeshes = [];
                        this.focusedMesh = this.hoveredMesh = null;
                    }

                    Array.from(files).forEach(file => {
                        this.pendingUploads.push(file);
                        const reader = new FileReader();
                        reader.onload = ev => {
                            // Draw polaroid and load
                            this.addPhotoToGlobe(ev.target.result, this.memoryMeshes.length, file.name.split('.')[0]);
                            this.recalculateGlobe();
                            this._updatePhotoCounter();
                        };
                        reader.readAsDataURL(file);
                    });

                    if (shareBtn) shareBtn.style.display = 'block';
                    if (targetNameInp) targetNameInp.style.display = 'block';
                    const letterTextInp = document.getElementById('letter-text-input');
                    if (letterTextInp) letterTextInp.style.display = 'block';
                    showToast(`Added ${files.length} photo prints`, 'rose');
                });
            }

            // Emoji reaction click
            document.querySelectorAll('.emoji-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const captionInput = document.getElementById('caption-input');
                    if (captionInput && this.focusedMesh) {
                        captionInput.value += btn.dataset.emoji;
                        this.updatePolaroidCaption(this.focusedMesh, captionInput.value);
                    }
                });
            });

            // Notepad caption type update
            const captionInput = document.getElementById('caption-input');
            if (captionInput) {
                captionInput.addEventListener('input', e => {
                    if (this.focusedMesh) {
                        this.updatePolaroidCaption(this.focusedMesh, e.target.value);
                    }
                });
            }

            // Flip Card Button click handler
            const flipPhotoBtn = document.getElementById('flip-photo-btn');
            if (flipPhotoBtn) {
                flipPhotoBtn.addEventListener('click', () => {
                    if (this.focusedMesh) {
                        this.focusedMesh.userData.isFlipped = !this.focusedMesh.userData.isFlipped;
                        this.audio.pluck(659.25, 0.25);
                        showToast(this.focusedMesh.userData.isFlipped ? 'Flipped to back of photo 📝' : 'Flipped to front 📸', 'gold');
                    }
                });
            }

            // Save/Share
            if (shareBtn && shareModal && closeShareBtn) {
                shareBtn.addEventListener('click', async () => {
                    if (!this.pendingUploads.length) return;
                    const origText = shareBtn.textContent;
                    shareBtn.textContent = '✉️ Mailing letter...';
                    shareBtn.disabled = true;

                    const fd = new FormData();
                    this.pendingUploads.forEach(f => fd.append('photos', f));
                    if (targetNameInp && targetNameInp.value.trim()) {
                        fd.append('target_name', targetNameInp.value.trim());
                    }
                    const letterTextInp = document.getElementById('letter-text-input');
                    if (letterTextInp && letterTextInp.value.trim()) {
                        fd.append('letter_text', letterTextInp.value.trim());
                    } else if (this.letterText && this.letterText.trim()) {
                        fd.append('letter_text', this.letterText.trim());
                    }

                    try {
                        const res = await fetch('/api/upload', { method: 'POST', body: fd });
                        const data = await res.json();
                        if (data.share_id) {
                            const link = `${window.location.origin}/?share=${data.share_id}`;
                            shareLinkInput.value = link;
                            shareModal.style.display = 'block';
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Failed to create sharing link', 'rose');
                    } finally {
                        shareBtn.textContent = origText;
                        shareBtn.disabled = false;
                    }
                });

                if (copyLinkBtn) {
                    copyLinkBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(shareLinkInput.value).then(() => {
                            showToast('Copied link to clipboard', 'gold');
                            copyLinkBtn.textContent = '✅ Copied!';
                            setTimeout(() => { copyLinkBtn.textContent = '📋 Copy Share Link'; }, 2000);
                        });
                    });
                }

                closeShareBtn.addEventListener('click', () => { shareModal.style.display = 'none'; });
            }

            // ─── AUTHENTICATION STATE & LOGIC ───
            const authScreen = document.getElementById('auth-screen');
            const authForm = document.getElementById('auth-form');
            const authTitle = document.getElementById('auth-title');
            const authSub = document.getElementById('auth-sub');
            const authToggleLink = document.getElementById('auth-toggle-link');
            const authToggleText = document.getElementById('auth-toggle-text');
            const authSubmitBtn = document.getElementById('auth-submit-btn');
            const closeAuthBtn = document.getElementById('close-auth-btn');
            const navLoginBtn = document.getElementById('nav-login-btn');
            const navLogoutBtn = document.getElementById('nav-logout-btn');
            const navDashboardBtn = document.getElementById('nav-dashboard-btn');
            const userGreeting = document.getElementById('user-greeting');

            // Mobile drawer counterparts
            const navLoginBtnMob     = document.getElementById('nav-login-btn-mob');
            const navLogoutBtnMob    = document.getElementById('nav-logout-btn-mob');
            const navDashboardBtnMob = document.getElementById('nav-dashboard-btn-mob');
            const userGreetingMob    = document.getElementById('user-greeting-mob');
            const navHamburger       = document.getElementById('nav-hamburger');
            const navDrawer          = document.getElementById('nav-drawer');
            
            const dashboardModal = document.getElementById('dashboard-modal');
            const closeDashboardBtn = document.getElementById('close-dashboard-btn');
            const dashboardCreateBtn = document.getElementById('dashboard-create-btn');
            const dashboardList = document.getElementById('dashboard-list');
            
            let isSignUpMode = false;
            let loggedInUser = null;

            // ── Hamburger toggle ──────────────────────────────────────
            const closeDrawer = () => {
                if (navDrawer) navDrawer.classList.remove('open');
            };
            if (navHamburger && navDrawer) {
                navHamburger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navDrawer.classList.toggle('open');
                });
                // Close drawer when tapping outside
                document.addEventListener('click', (e) => {
                    if (!navDrawer.contains(e.target) && e.target !== navHamburger) {
                        closeDrawer();
                    }
                });
            }

            // Toggle Login / Sign Up UI
            if (authToggleLink) {
                authToggleLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    isSignUpMode = !isSignUpMode;
                    if (isSignUpMode) {
                        authTitle.textContent = 'Sign Up';
                        authSub.textContent = 'Create a new account to build memory boxes';
                        authSubmitBtn.textContent = 'Register & Sign In';
                        authToggleText.textContent = 'Already have an account?';
                        authToggleLink.textContent = 'Log In';
                    } else {
                        authTitle.textContent = 'Log In';
                        authSub.textContent = 'Access your letters and dashboard';
                        authSubmitBtn.textContent = 'Log In';
                        authToggleText.textContent = "Don't have an account?";
                        authToggleLink.textContent = 'Sign Up';
                    }
                });
            }

            // Open Auth screen
            if (navLoginBtn) {
                navLoginBtn.addEventListener('click', () => {
                    authScreen.style.display = 'block';
                    authForm.reset();
                });
            }

            if (closeAuthBtn) {
                closeAuthBtn.addEventListener('click', () => {
                    authScreen.style.display = 'none';
                });
            }

            // Auth Form Submit
            if (authForm) {
                authForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const username = document.getElementById('auth-username').value;
                    const password = document.getElementById('auth-password').value;
                    
                    const endpoint = isSignUpMode ? '/api/auth/signup' : '/api/auth/login';
                    try {
                        const res = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, password })
                        });
                        const data = await res.json();
                        
                        if (data.error) {
                            showToast(data.error, 'rose');
                        } else {
                            showToast(isSignUpMode ? 'Welcome, signed up! 🕯️' : 'Welcome back! ❤️', 'gold');
                            authScreen.style.display = 'none';
                            updateAuthUI(data.username);
                            // Automatically load dashboard
                            loadDashboard();
                            dashboardModal.style.display = 'block';
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Authentication failed', 'rose');
                    }
                });
            }

            // Logout
            if (navLogoutBtn) {
                navLogoutBtn.addEventListener('click', async () => {
                    try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        showToast('Logged out successfully', 'rose');
                        updateAuthUI(null);
                        dashboardModal.style.display = 'none';
                    } catch (err) {
                        console.error(err);
                    }
                });
            }

            // Open Dashboard
            if (navDashboardBtn) {
                navDashboardBtn.addEventListener('click', () => {
                    loadDashboard();
                    dashboardModal.style.display = 'block';
                });
            }

            if (closeDashboardBtn) {
                closeDashboardBtn.addEventListener('click', () => {
                    dashboardModal.style.display = 'none';
                });
            }

            // Create New Box from Dashboard
            if (dashboardCreateBtn) {
                dashboardCreateBtn.addEventListener('click', () => {
                    dashboardModal.style.display = 'none';
                    const targetNameInp = document.getElementById('target-name-input');
                    const letterTextInp = document.getElementById('letter-text-input');
                    const shareBtn = document.getElementById('share-gallery-btn');
                    if (targetNameInp) {
                        targetNameInp.style.display = 'block';
                        targetNameInp.value = '';
                        targetNameInp.focus();
                    }
                    if (letterTextInp) {
                        letterTextInp.style.display = 'block';
                        letterTextInp.value = '';
                    }
                    if (shareBtn) shareBtn.style.display = 'block';
                    
                    const navCreateNewBtn = document.getElementById('nav-create-new-btn');
                    if (navCreateNewBtn) {
                        navCreateNewBtn.click();
                    } else if (btnYes && !btnYes.disabled) {
                        btnYes.click();
                    }
                    showToast('🌹 Type your lover name & add photos to craft your box!', 'gold', 3500);
                });
            }

            // Helper to update Auth navigation elements (desktop + mobile drawer)
            const updateAuthUI = (username) => {
                loggedInUser = username;
                if (username) {
                    // Desktop
                    if (navLoginBtn)     navLoginBtn.style.display = 'none';
                    if (navLogoutBtn)    navLogoutBtn.style.display = 'inline-block';
                    if (navDashboardBtn) navDashboardBtn.style.display = 'inline-block';
                    if (userGreeting) {
                        userGreeting.style.display = 'inline';
                        userGreeting.textContent = `Hello, ${username} ✨`;
                    }
                    // Mobile drawer
                    if (navLoginBtnMob)     navLoginBtnMob.style.display = 'none';
                    if (navLogoutBtnMob)    navLogoutBtnMob.style.display = 'flex';
                    if (navDashboardBtnMob) navDashboardBtnMob.style.display = 'flex';
                    if (userGreetingMob) {
                        userGreetingMob.style.display = 'block';
                        userGreetingMob.textContent = `Hello, ${username} ✨`;
                    }
                } else {
                    // Desktop
                    if (navLoginBtn)     navLoginBtn.style.display = 'inline-block';
                    if (navLogoutBtn)    navLogoutBtn.style.display = 'none';
                    if (navDashboardBtn) navDashboardBtn.style.display = 'none';
                    if (userGreeting)    userGreeting.style.display = 'none';
                    // Mobile drawer
                    if (navLoginBtnMob)     navLoginBtnMob.style.display = 'flex';
                    if (navLogoutBtnMob)    navLogoutBtnMob.style.display = 'none';
                    if (navDashboardBtnMob) navDashboardBtnMob.style.display = 'none';
                    if (userGreetingMob)    userGreetingMob.style.display = 'none';
                }
            };

            // Wire mobile drawer buttons to same handlers
            if (navLoginBtnMob) {
                navLoginBtnMob.addEventListener('click', () => {
                    closeDrawer();
                    if (authScreen) {
                        authScreen.style.display = 'block';
                        authForm.reset();
                    }
                });
            }
            if (navLogoutBtnMob) {
                navLogoutBtnMob.addEventListener('click', async () => {
                    closeDrawer();
                    try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        showToast('Logged out successfully', 'rose');
                        updateAuthUI(null);
                        if (dashboardModal) dashboardModal.style.display = 'none';
                    } catch (err) { console.error(err); }
                });
            }
            if (navDashboardBtnMob) {
                navDashboardBtnMob.addEventListener('click', () => {
                    closeDrawer();
                    loadDashboard();
                    if (dashboardModal) dashboardModal.style.display = 'block';
                });
            }

            // Desktop & Mobile Camera Buttons
            const navCameraBtn = document.getElementById('nav-camera-btn');
            if (navCameraBtn) {
                navCameraBtn.addEventListener('click', () => {
                    this.toggleCamera();
                });
            }
            const navCameraBtnMob = document.getElementById('nav-camera-btn-mob');
            if (navCameraBtnMob) {
                navCameraBtnMob.addEventListener('click', () => {
                    closeDrawer();
                    this.toggleCamera();
                });
            }

            // Check Auth Status on boot
            const checkAuthStatus = async () => {
                try {
                    const res = await fetch('/api/auth/status');
                    const data = await res.json();
                    if (data.logged_in) {
                        updateAuthUI(data.username);
                    }
                } catch (err) {
                    console.error('Failed to fetch auth status', err);
                }
            };
            checkAuthStatus();

            // ─── DASHBOARD TABS & SEARCH LOGIC ───
            let currentDashTab = 'received';
            let cachedDashboardData = { created_shares: [], received_shares: [] };

            const dashTabReceived = document.getElementById('dash-tab-received');
            const dashTabCreated = document.getElementById('dash-tab-created');
            const dashEmptyReceived = document.getElementById('dashboard-empty-received');
            const dashEmptyCreated = document.getElementById('dashboard-empty-created');
            const dashSearchInput = document.getElementById('dash-search-input');
            const dashSearchBtn = document.getElementById('dash-search-btn');

            const setDashTab = (tab) => {
                currentDashTab = tab;
                if (dashTabReceived && dashTabCreated) {
                    if (tab === 'received') {
                        dashTabReceived.classList.add('active');
                        dashTabReceived.style.color = 'var(--gold)';
                        dashTabReceived.style.borderBottom = '2px solid var(--gold)';
                        dashTabCreated.classList.remove('active');
                        dashTabCreated.style.color = 'var(--text-muted)';
                        dashTabCreated.style.borderBottom = 'none';
                    } else {
                        dashTabCreated.classList.add('active');
                        dashTabCreated.style.color = 'var(--gold)';
                        dashTabCreated.style.borderBottom = '2px solid var(--gold)';
                        dashTabReceived.classList.remove('active');
                        dashTabReceived.style.color = 'var(--text-muted)';
                        dashTabReceived.style.borderBottom = 'none';
                    }
                }
                renderDashboardRows();
            };

            if (dashTabReceived) {
                dashTabReceived.addEventListener('click', () => setDashTab('received'));
            }
            if (dashTabCreated) {
                dashTabCreated.addEventListener('click', () => setDashTab('created'));
            }

            const renderDashboardRows = (overrideList = null, isSearchResults = false) => {
                if (!dashboardList) return;
                dashboardList.innerHTML = '';

                let items;
                if (overrideList !== null) {
                    items = overrideList;
                } else if (currentDashTab === 'received') {
                    items = cachedDashboardData.received_shares || [];
                } else {
                    items = cachedDashboardData.created_shares || [];
                }

                if (dashEmptyReceived) dashEmptyReceived.style.display = 'none';
                if (dashEmptyCreated) dashEmptyCreated.style.display = 'none';

                if (!items || items.length === 0) {
                    if (isSearchResults) {
                        const noRes = document.createElement('div');
                        noRes.style.textAlign = 'center';
                        noRes.style.padding = '1.8rem 0';
                        noRes.style.color = 'var(--text-muted)';
                        noRes.innerHTML = '🔍 No matching love letters found.<br><span style="font-size:0.75rem;color:var(--gold);margin-top:4px;display:inline-block;">Try searching by your lover username or box code.</span>';
                        dashboardList.appendChild(noRes);
                    } else if (currentDashTab === 'received') {
                        if (dashEmptyReceived) dashEmptyReceived.style.display = 'block';
                    } else {
                        if (dashEmptyCreated) dashEmptyCreated.style.display = 'block';
                    }
                    return;
                }

                items.forEach(share => {
                    const row = document.createElement('div');
                    row.className = 'dashboard-item';

                    const info = document.createElement('div');
                    info.className = 'dashboard-item-info';

                    const badge = document.createElement('div');
                    badge.className = 'dashboard-badge-lover';

                    const title = document.createElement('div');
                    title.className = 'dashboard-item-title';

                    let subtitle = '';
                    if (isSearchResults) {
                        badge.textContent = '🔍 Search Match';
                        title.textContent = share.target_name ? `For: ${share.target_name} 🌹` : 'Anonymous Memory Box 🕯️';
                        if (share.creator_username) {
                            subtitle = `Crafted by: ${share.creator_username}`;
                        }
                    } else if (currentDashTab === 'received') {
                        badge.textContent = '💌 Love Letter For You';
                        title.textContent = `For: ${share.target_name || loggedInUser || 'My Love'} 🌹`;
                        subtitle = `Crafted with love by: ${share.creator_username || 'Your Secret Admirer'} ❤️`;
                    } else {
                        badge.textContent = '🌹 Crafted By You';
                        title.textContent = share.target_name ? `For: ${share.target_name}` : 'Anonymous Memory Box';
                    }

                    const meta = document.createElement('div');
                    meta.className = 'dashboard-item-meta';
                    meta.textContent = `🔗 Code: ${share.id} | 📷 ${share.photo_count} photos${share.created_at ? ' | 📅 ' + share.created_at.slice(0, 10) : ''}`;

                    info.appendChild(badge);
                    info.appendChild(title);
                    if (subtitle) {
                        const subEl = document.createElement('div');
                        subEl.style.fontSize = '0.78rem';
                        subEl.style.color = 'var(--rose)';
                        subEl.style.marginTop = '2px';
                        subEl.textContent = subtitle;
                        info.appendChild(subEl);
                    }
                    info.appendChild(meta);

                    const actions = document.createElement('div');
                    actions.className = 'dashboard-item-actions';

                    const openBtn = document.createElement('button');
                    openBtn.className = 'btn-open';
                    openBtn.textContent = '👁️ Open';
                    openBtn.onclick = () => {
                        window.location.search = `?share=${share.id}`;
                    };

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'btn-copy';
                    copyBtn.textContent = '📋 Copy Link';
                    copyBtn.onclick = () => {
                        const link = `${window.location.origin}/?share=${share.id}`;
                        navigator.clipboard.writeText(link).then(() => {
                            showToast('Copied link! 💌', 'gold');
                            copyBtn.textContent = '✅ Copied!';
                            setTimeout(() => { copyBtn.textContent = '📋 Copy Link'; }, 2000);
                        });
                    };

                    actions.appendChild(openBtn);
                    actions.appendChild(copyBtn);

                    // Allow delete if user is the creator
                    const isCreator = currentDashTab === 'created' || (share.creator_username && loggedInUser && share.creator_username.toLowerCase() === loggedInUser.toLowerCase());
                    if (isCreator && !isSearchResults) {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'btn-delete';
                        deleteBtn.textContent = '🗑️ Delete';
                        deleteBtn.onclick = async () => {
                            if (confirm('Are you sure you want to delete this memory box? This cannot be undone.')) {
                                try {
                                    const delRes = await fetch(`/api/share/${share.id}`, { method: 'DELETE' });
                                    const delData = await delRes.json();
                                    if (delData.error) {
                                        showToast(delData.error, 'rose');
                                    } else {
                                        showToast('Memory box deleted', 'rose');
                                        loadDashboard();
                                    }
                                } catch (err) {
                                    console.error(err);
                                    showToast('Failed to delete', 'rose');
                                }
                            }
                        };
                        actions.appendChild(deleteBtn);
                    }

                    row.appendChild(info);
                    row.appendChild(actions);
                    dashboardList.appendChild(row);
                });
            };

            // Search box lookup
            if (dashSearchBtn && dashSearchInput) {
                const handleSearch = async () => {
                    const query = dashSearchInput.value.trim();
                    if (!query) {
                        renderDashboardRows();
                        return;
                    }
                    try {
                        const res = await fetch(`/api/boxes/find?q=${encodeURIComponent(query)}`);
                        const data = await res.json();
                        renderDashboardRows(data.boxes || [], true);
                        if (data.boxes && data.boxes.length > 0) {
                            showToast(`Found ${data.boxes.length} memory box(es) 💌`, 'gold');
                        } else {
                            showToast('No boxes found for this query', 'rose');
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Search failed', 'rose');
                    }
                };

                dashSearchBtn.addEventListener('click', handleSearch);
                dashSearchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') handleSearch();
                });
            }

            // Load & Render Dashboard Items
            const loadDashboard = async () => {
                try {
                    const res = await fetch('/api/dashboard');
                    if (res.status === 401) {
                        authScreen.style.display = 'block';
                        return;
                    }
                    const data = await res.json();
                    cachedDashboardData = {
                        created_shares: data.created_shares || data.shares || [],
                        received_shares: data.received_shares || []
                    };
                    
                    // If user has received letters, default to 'received' tab, otherwise 'created'
                    if (cachedDashboardData.received_shares.length > 0) {
                        setDashTab('received');
                    } else {
                        setDashTab('created');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Failed to load dashboard', 'rose');
                }
            };

            // ─── CREATE YOUR OWN BOX FROM ANONYMOUS LINK ───
            const navCreateNewBtn = document.getElementById('nav-create-new-btn');
            if (navCreateNewBtn) {
                navCreateNewBtn.addEventListener('click', () => {
                    // Clear search params in URL without reload
                    window.history.pushState(null, '', window.location.pathname);
                    
                    // Reset gallery to default placeholders
                    this.hasUserPhotos = false;
                    this.memoryMeshes.forEach(mesh => {
                        this.carouselGroup.remove(mesh);
                        mesh.geometry.dispose();
                        // materials is now an array (BoxGeometry uses 6 face materials)
                        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                    });
                    this.memoryMeshes = [];
                    this.focusedMesh = this.hoveredMesh = null;
                    
                    // Load standard placeholder photos
                    for (let i = 0; i < 20; i++) {
                        const url = `https://picsum.photos/seed/${i + 70}/400/600`;
                        this.addPhotoToGlobe(url, i, `Warm memory ${i + 1}`);
                    }
                    this.recalculateGlobe();
                    this._updatePhotoCounter();
                    
                    // Reset caption notepad panel
                    const panel = document.getElementById('caption-panel');
                    if (panel) panel.style.display = 'none';
                    
                    // Show lover inputs
                    const shareBtn = document.getElementById('share-gallery-btn');
                    const targetNameInp = document.getElementById('target-name-input');
                    const letterTextInp = document.getElementById('letter-text-input');
                    if (targetNameInp) {
                        targetNameInp.style.display = 'block';
                        targetNameInp.value = '';
                    }
                    if (letterTextInp) {
                        letterTextInp.style.display = 'block';
                        letterTextInp.value = '';
                    }
                    if (shareBtn) shareBtn.style.display = 'block';

                    // Reset greeting/landing text
                    const q = document.getElementById('love-question');
                    if (q) q.innerText = 'Would you like to open our memory box?';
                    
                    // If they are on the landing page, click Step Inside automatically
                    const loadingScreen = document.getElementById('loading-screen');
                    if (loadingScreen && loadingScreen.style.display !== 'none') {
                        if (btnYes) btnYes.click();
                    }
                    
                    closeDrawer();
                    showToast('Started a new memory box! 🕯️ Type lover username & add photos', 'gold', 3500);
                });
            }

            // Mobile drawer Create Yours — same logic as desktop button
            const navCreateNewBtnMob = document.getElementById('nav-create-new-btn-mob');
            if (navCreateNewBtnMob) {
                navCreateNewBtnMob.addEventListener('click', () => {
                    const desktopBtn = document.getElementById('nav-create-new-btn');
                    if (desktopBtn) desktopBtn.click(); // reuse the exact same handler
                    closeDrawer();
                });
            }

            // ─── 3D FORMATION SWITCHER EVENT HANDLERS ───
            document.querySelectorAll('[data-layout]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.setLayout(btn.dataset.layout);
                });
            });

            const navLayoutBtnMob = document.getElementById('nav-layout-btn-mob');
            if (navLayoutBtnMob) {
                navLayoutBtnMob.addEventListener('click', () => {
                    const layouts = ['sphere', 'heart', 'spiral'];
                    const nextIdx = (layouts.indexOf(this.currentLayout) + 1) % layouts.length;
                    this.setLayout(layouts[nextIdx]);
                });
            }

            // ─── ATMOSPHERE & MOOD THEMES EVENT HANDLERS ───
            document.querySelectorAll('[data-theme]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.setTheme(btn.dataset.theme);
                });
            });

            const cycleTheme = () => {
                const themes = ['candlelit', 'midnight', 'sunset', 'vintage'];
                const nextIdx = (themes.indexOf(this.currentTheme) + 1) % themes.length;
                this.setTheme(themes[nextIdx]);
            };

            const navThemeBtn = document.getElementById('nav-theme-btn');
            if (navThemeBtn) navThemeBtn.addEventListener('click', cycleTheme);
            const navThemeBtnMob = document.getElementById('nav-theme-btn-mob');
            if (navThemeBtnMob) navThemeBtnMob.addEventListener('click', cycleTheme);

            // ─── CINEMATIC MEMORY TOUR EVENT HANDLERS ───
            const triggerTour = () => {
                closeDrawer();
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen && loadingScreen.style.display !== 'none' && btnYes && !btnYes.disabled) {
                    btnYes.click();
                }
                this.startTour();
            };

            const navTourBtn = document.getElementById('nav-tour-btn');
            if (navTourBtn) navTourBtn.addEventListener('click', triggerTour);
            const navTourBtnMob = document.getElementById('nav-tour-btn-mob');
            if (navTourBtnMob) navTourBtnMob.addEventListener('click', triggerTour);
            const tourPanelBtn = document.getElementById('tour-panel-btn');
            if (tourPanelBtn) tourPanelBtn.addEventListener('click', triggerTour);

            const tourPrevBtn = document.getElementById('tour-prev-btn');
            if (tourPrevBtn) tourPrevBtn.addEventListener('click', () => this.prevTourSlide());
            const tourNextBtn = document.getElementById('tour-next-btn');
            if (tourNextBtn) tourNextBtn.addEventListener('click', () => this.nextTourSlide());
            const tourPauseBtn = document.getElementById('tour-pause-btn');
            if (tourPauseBtn) tourPauseBtn.addEventListener('click', () => this.togglePauseTour());
            const tourExitBtn = document.getElementById('tour-exit-btn');
            if (tourExitBtn) tourExitBtn.addEventListener('click', () => this.stopTour());

            // ─── WAX-SEALED LOVE LETTER EVENT HANDLERS ───
            const triggerLetter = () => {
                closeDrawer();
                this.openLoveLetterModal();
            };

            const navLetterBtn = document.getElementById('nav-letter-btn');
            if (navLetterBtn) navLetterBtn.addEventListener('click', triggerLetter);
            const navLetterBtnMob = document.getElementById('nav-letter-btn-mob');
            if (navLetterBtnMob) navLetterBtnMob.addEventListener('click', triggerLetter);
            const letterPanelBtn = document.getElementById('letter-panel-btn');
            if (letterPanelBtn) letterPanelBtn.addEventListener('click', triggerLetter);

            const waxSealBtn = document.getElementById('wax-seal-btn');
            if (waxSealBtn) waxSealBtn.addEventListener('click', () => this.breakWaxSeal());

            const closeLetterModalBtn = document.getElementById('close-letter-modal-btn');
            const loveLetterModal = document.getElementById('love-letter-modal');
            if (closeLetterModalBtn && loveLetterModal) {
                closeLetterModalBtn.addEventListener('click', () => { loveLetterModal.style.display = 'none'; });
            }

            const letterResealBtn = document.getElementById('letter-reseal-btn');
            if (letterResealBtn && loveLetterModal) {
                letterResealBtn.addEventListener('click', () => {
                    loveLetterModal.style.display = 'none';
                    showToast('Folded and sealed letter away ✉️', 'gold');
                });
            }

            const letterCopyBtn = document.getElementById('letter-copy-btn');
            if (letterCopyBtn) {
                letterCopyBtn.addEventListener('click', () => {
                    const bodyEl = document.getElementById('letter-view-body');
                    if (bodyEl) {
                        navigator.clipboard.writeText(bodyEl.innerText).then(() => {
                            showToast('Copied love letter! 💌', 'gold');
                            letterCopyBtn.textContent = '✅ Copied!';
                            setTimeout(() => { letterCopyBtn.textContent = '📋 Copy Letter'; }, 2000);
                        });
                    }
                });
            }

            // Letter Editor within Modal
            const letterEditBtn = document.getElementById('letter-edit-btn');
            const letterEditView = document.getElementById('letter-edit-view');
            const letterUnfoldedView = document.getElementById('letter-unfolded-view');
            const letterEditorInput = document.getElementById('letter-editor-input');
            const letterEditorCancel = document.getElementById('letter-editor-cancel-btn');
            const letterEditorSave = document.getElementById('letter-editor-save-btn');

            if (letterEditBtn && letterEditView && letterUnfoldedView && letterEditorInput) {
                letterEditBtn.addEventListener('click', () => {
                    letterUnfoldedView.style.display = 'none';
                    letterEditView.style.display = 'block';
                    letterEditorInput.value = this.letterText || "Every moment with you feels like catching starlight in a jar. Through every laugh, every quiet evening, and every step along our path, you make ordinary days feel extraordinary.\n\nThank you for being my favorite memory, today and every tomorrow.";
                    letterEditorInput.focus();
                });

                if (letterEditorCancel) {
                    letterEditorCancel.addEventListener('click', () => {
                        letterEditView.style.display = 'none';
                        letterUnfoldedView.style.display = 'block';
                    });
                }

                if (letterEditorSave) {
                    letterEditorSave.addEventListener('click', () => {
                        this.letterText = letterEditorInput.value.trim();
                        const letterTextInp = document.getElementById('letter-text-input');
                        if (letterTextInp) letterTextInp.value = this.letterText;
                        
                        const bodyEl = document.getElementById('letter-view-body');
                        if (bodyEl) bodyEl.innerHTML = this.letterText.replace(/\n/g, '<br>');

                        letterEditView.style.display = 'none';
                        letterUnfoldedView.style.display = 'block';
                        showToast('Saved your love letter! 💌', 'gold');
                    });
                }
            }

            // ─── KEYBOARD SHORTCUTS ───
            window.addEventListener('keydown', (e) => {
                const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
                if (tag === 'input' || tag === 'textarea') return;

                if (e.key === 't' || e.key === 'T') {
                    if (this.isTouring) this.stopTour();
                    else triggerTour();
                } else if (e.key === 'l' || e.key === 'L') {
                    const layouts = ['sphere', 'heart', 'spiral'];
                    const nextIdx = (layouts.indexOf(this.currentLayout) + 1) % layouts.length;
                    this.setLayout(layouts[nextIdx]);
                } else if (e.key === 'm' || e.key === 'M') {
                    cycleTheme();
                } else if (e.key === ' ') {
                    e.preventDefault();
                    if (this.isTouring) {
                        this.togglePauseTour();
                    } else if (this.focusedMesh) {
                        this.focusedMesh.userData.isFlipped = !this.focusedMesh.userData.isFlipped;
                        if (this.audio) this.audio.pluck(659.25, 0.25);
                        showToast(this.focusedMesh.userData.isFlipped ? 'Flipped to back of photo 📝' : 'Flipped to front 📸', 'gold');
                    }
                } else if (e.key === 'Escape') {
                    if (this.isTouring) this.stopTour();
                    if (loveLetterModal) loveLetterModal.style.display = 'none';
                    const shareModal = document.getElementById('share-modal');
                    if (shareModal) shareModal.style.display = 'none';
                    const authScreen = document.getElementById('auth-screen');
                    if (authScreen) authScreen.style.display = 'none';
                    const dashModal = document.getElementById('dashboard-modal');
                    if (dashModal) dashModal.style.display = 'none';
                }
            });
        };

        btnYes.addEventListener('click', handleYes);
    }
}

/* ═══════════════════════════════════════════════════════════
   START PROGRAM
═══════════════════════════════════════════════════════════ */
window.onload = () => {
    // Pre-warm speech synthesis voices
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    }
    new MemoryBoxTheater();
};

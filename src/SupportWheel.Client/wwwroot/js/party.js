/**
 * Party Mode effects — orchestration, Web Audio sounds, emoji explosions.
 * Called from Blazor WASM via JS interop.
 */
window.PartyMode = {
    _audioCtx: null,
    _drumTimeout: null,
    _emojiContainer: null,
    _disposed: false,

    /**
     * Initialize/resume AudioContext. MUST be called from a user gesture (click).
     */
    initAudio: function () {
        console.log('[DIAG] PartyMode.initAudio called');
        if (!this._audioCtx) {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[DIAG] AudioContext created, state:', this._audioCtx.state);
        }
        if (this._audioCtx.state === 'suspended') {
            this._audioCtx.resume();
            console.log('[DIAG] AudioContext resumed');
        }
    },

    /**
     * Set party mode classes on document.body.
     * @param {boolean} enabled
     * @param {number} intensity - 1 (mild), 2 (medium), 3 (chaos)
     */
    setBodyClass: function (enabled, intensity) {
        var body = document.body;
        var html = document.documentElement;
        var targets = [body, html];
        targets.forEach(function(el) {
            el.classList.remove('party-mode', 'party-mild', 'party-medium', 'party-chaos');
            if (enabled) {
                el.classList.add('party-mode');
                var level = intensity === 3 ? 'party-chaos' : intensity === 2 ? 'party-medium' : 'party-mild';
                el.classList.add(level);
            }
        });
    },

    /**
     * Trigger background flash effect (on win).
     * Uses both body class animation AND a fullscreen overlay for guaranteed visibility.
     */
    triggerFlash: function (intensity) {
        console.log('[DIAG] PartyMode.triggerFlash intensity:', intensity);
        var body = document.body;
        body.classList.remove('party-flash-mild', 'party-flash-medium', 'party-flash-chaos');
        void body.offsetWidth;
        var level = intensity >= 3 ? 'party-flash-chaos' : intensity >= 2 ? 'party-flash-medium' : 'party-flash-mild';
        body.classList.add(level);

        // Also create a fullscreen flash overlay for guaranteed visibility
        var overlay = document.createElement('div');
        overlay.className = 'party-flash-overlay party-flash-overlay-' + (intensity >= 3 ? 'chaos' : intensity >= 2 ? 'medium' : 'mild');
        document.body.appendChild(overlay);

        var duration = intensity >= 3 ? 4500 : intensity >= 2 ? 3600 : 2000;
        setTimeout(function () {
            body.classList.remove('party-flash-mild', 'party-flash-medium', 'party-flash-chaos');
            if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        }, duration);
    },

    /**
     * Check if user prefers reduced motion.
     */
    prefersReducedMotion: function () {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    /**
     * Play drum roll: rapid snare taps that accelerate (recognizable drum roll).
     */
    playDrumRoll: function (intensity) {
        if (!this._audioCtx) return;
        var ctx = this._audioCtx;
        // Match wheel spin duration (5s) — roll ends just before wheel stops
        var duration = intensity >= 3 ? 4.5 : intensity >= 2 ? 4.0 : 3.5;
        var now = ctx.currentTime;

        // Number of taps increases with intensity
        var numTaps = intensity >= 3 ? 30 : intensity >= 2 ? 22 : 16;
        var masterGain = ctx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(ctx.destination);

        for (var i = 0; i < numTaps; i++) {
            // Accelerating taps: intervals get shorter toward the end
            var progress = i / numTaps;
            var tapTime = now + duration * (1 - Math.pow(1 - progress, 2));

            // Snare sound: short noise burst + tone
            var bufLen = Math.floor(ctx.sampleRate * 0.04);
            var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            var d = buf.getChannelData(0);
            for (var j = 0; j < bufLen; j++) {
                d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufLen * 0.3));
            }

            var src = ctx.createBufferSource();
            src.buffer = buf;

            // Highpass to make it snappy
            var hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 2000 + progress * 3000;

            // Volume crescendo
            var tapGain = ctx.createGain();
            var vol = 0.15 + progress * 0.85;
            tapGain.gain.setValueAtTime(vol, tapTime);
            tapGain.gain.exponentialRampToValueAtTime(0.01, tapTime + 0.04);

            src.connect(hp);
            hp.connect(tapGain);
            tapGain.connect(masterGain);
            src.start(tapTime);
            src.stop(tapTime + 0.04);

            // Add a tonal "tap" for body
            var tone = ctx.createOscillator();
            tone.type = 'triangle';
            tone.frequency.value = 180 + progress * 60;
            var toneGain = ctx.createGain();
            toneGain.gain.setValueAtTime(vol * 0.3, tapTime);
            toneGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.03);
            tone.connect(toneGain);
            toneGain.connect(masterGain);
            tone.start(tapTime);
            tone.stop(tapTime + 0.03);
        }
    },

    /**
     * Play LOUD victory fanfare — heavy bass beats followed by a celebration melody.
     * Designed to be unmissable in a room full of people.
     */
    playFanfare: function (intensity) {
        console.log('[DIAG] PartyMode.playFanfare intensity:', intensity);
        if (!this._audioCtx) {
            console.log('[DIAG] playFanfare: no AudioContext!');
            return;
        }
        var ctx = this._audioCtx;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        var now = ctx.currentTime;

        var beats = intensity >= 3 ? 10 : intensity >= 2 ? 7 : 4;
        var bpm = intensity >= 3 ? 160 : 140;
        var beatInterval = 60 / bpm;

        // Master gain — LOUD
        var masterGain = ctx.createGain();
        masterGain.gain.value = intensity >= 3 ? 0.7 : intensity >= 2 ? 0.55 : 0.45;
        masterGain.connect(ctx.destination);

        for (var i = 0; i < beats; i++) {
            var t = now + i * beatInterval;

            // Kick drum: sine wave pitch drop (180Hz -> 35Hz) with longer sustain
            var kick = ctx.createOscillator();
            kick.type = 'sine';
            kick.frequency.setValueAtTime(180, t);
            kick.frequency.exponentialRampToValueAtTime(35, t + 0.12);

            var kickGain = ctx.createGain();
            kickGain.gain.setValueAtTime(1.0, t);
            kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

            kick.connect(kickGain);
            kickGain.connect(masterGain);
            kick.start(t);
            kick.stop(t + 0.45);

            // Sub-bass layer — deep thump with resonance
            var sub = ctx.createOscillator();
            sub.type = 'sine';
            sub.frequency.value = 50;
            var subGain = ctx.createGain();
            subGain.gain.setValueAtTime(0.8, t);
            subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
            sub.connect(subGain);
            subGain.connect(masterGain);
            sub.start(t);
            sub.stop(t + 0.35);

            // Click transient for punch
            var click = ctx.createOscillator();
            click.type = 'square';
            click.frequency.value = 1200;
            var clickGain = ctx.createGain();
            clickGain.gain.setValueAtTime(0.4, t);
            clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
            click.connect(clickGain);
            clickGain.connect(masterGain);
            click.start(t);
            click.stop(t + 0.025);

            // Extra resonant tom on every other beat
            if (i % 2 === 0) {
                var tom = ctx.createOscillator();
                tom.type = 'triangle';
                tom.frequency.setValueAtTime(120, t);
                tom.frequency.exponentialRampToValueAtTime(60, t + 0.15);
                var tomGain = ctx.createGain();
                tomGain.gain.setValueAtTime(0.5, t);
                tomGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
                tom.connect(tomGain);
                tomGain.connect(masterGain);
                tom.start(t);
                tom.stop(t + 0.25);
            }
        }

        // Victory melody AFTER the beats — ascending celebration jingle
        var melodyStart = now + beats * beatInterval + 0.1;
        // C5, E5, G5, C6 (major chord arpeggio)
        var melodyNotes = intensity >= 3
            ? [523, 659, 784, 1047, 1175, 1319, 1047]
            : intensity >= 2
                ? [523, 659, 784, 1047, 784]
                : [523, 659, 784, 1047];
        var noteDuration = intensity >= 3 ? 0.12 : 0.15;

        var melodyGain = ctx.createGain();
        melodyGain.gain.value = intensity >= 3 ? 0.5 : 0.4;
        melodyGain.connect(masterGain);

        for (var m = 0; m < melodyNotes.length; m++) {
            var mt = melodyStart + m * noteDuration;

            // Main tone
            var note = ctx.createOscillator();
            note.type = 'square';
            note.frequency.value = melodyNotes[m];
            var noteGain = ctx.createGain();
            noteGain.gain.setValueAtTime(0.6, mt);
            noteGain.gain.exponentialRampToValueAtTime(0.01, mt + noteDuration * 1.8);
            note.connect(noteGain);
            noteGain.connect(melodyGain);
            note.start(mt);
            note.stop(mt + noteDuration * 2);

            // Harmonic layer (fifth above)
            var harm = ctx.createOscillator();
            harm.type = 'sine';
            harm.frequency.value = melodyNotes[m] * 1.5;
            var harmGain = ctx.createGain();
            harmGain.gain.setValueAtTime(0.2, mt);
            harmGain.gain.exponentialRampToValueAtTime(0.01, mt + noteDuration * 1.5);
            harm.connect(harmGain);
            harmGain.connect(melodyGain);
            harm.start(mt);
            harm.stop(mt + noteDuration * 1.5);
        }

        // Chaos: distorted bass drop after melody
        if (intensity >= 3) {
            var dropTime = melodyStart + melodyNotes.length * noteDuration + 0.1;
            var drop = ctx.createOscillator();
            drop.type = 'sawtooth';
            drop.frequency.setValueAtTime(250, dropTime);
            drop.frequency.exponentialRampToValueAtTime(25, dropTime + 1.2);

            var dropGain = ctx.createGain();
            dropGain.gain.setValueAtTime(0.6, dropTime);
            dropGain.gain.exponentialRampToValueAtTime(0.001, dropTime + 1.5);

            var waveshaper = ctx.createWaveShaper();
            var curve = new Float32Array(256);
            for (var j = 0; j < 256; j++) {
                var x = (j * 2) / 256 - 1;
                curve[j] = (Math.PI + 5) * x / (Math.PI + 5 * Math.abs(x));
            }
            waveshaper.curve = curve;

            drop.connect(waveshaper);
            waveshaper.connect(dropGain);
            dropGain.connect(masterGain);
            drop.start(dropTime);
            drop.stop(dropTime + 1.5);
        }
    },

    /**
     * Spawn emoji explosion from center of screen.
     */
    spawnEmojis: function (intensity) {
        var emojis = ['🎉', '🎊', '🥳', '🪩', '✨', '🎈', '🎆', '💃', '🕺', '🏆', '🔥', '⭐'];
        var count = intensity >= 3 ? 50 : intensity >= 2 ? 20 : 10;
        var container = document.createElement('div');
        container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10000;overflow:hidden;';
        document.body.appendChild(container);
        this._emojiContainer = container;

        for (var i = 0; i < count; i++) {
            var span = document.createElement('span');
            span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            span.style.cssText = 'position:absolute;font-size:' + (1.5 + Math.random() * 2.5) + 'rem;'
                + 'left:' + (10 + Math.random() * 80) + '%;'
                + 'top:50%;opacity:1;transition:all ' + (1.2 + Math.random() * 2) + 's cubic-bezier(0.25, 0.46, 0.45, 0.94);';
            container.appendChild(span);

            requestAnimationFrame(function (el, angle, dist) {
                return function () {
                    el.style.transform = 'translate(' + (Math.cos(angle) * dist) + 'px, '
                        + (Math.sin(angle) * dist) + 'px) rotate(' + (Math.random() * 1080 - 540) + 'deg) scale(' + (0.5 + Math.random()) + ')';
                    el.style.opacity = '0';
                };
            }(span, Math.random() * Math.PI * 2, 300 + Math.random() * 500));
        }

        setTimeout(function () {
            if (container.parentElement) {
                container.parentElement.removeChild(container);
            }
        }, 4000);
    },

    /**
     * Called when spin starts — triggers drum roll + visual prep.
     */
    onSpinStart: function (intensity) {
        console.log('[DIAG] PartyMode.onSpinStart intensity:', intensity);
        this._disposed = false;
        if (intensity >= 2) {
            this.playDrumRoll(intensity);
        }
    },

    /**
     * Called when spin completes — triggers flash + fanfare + emoji + spotlight.
     */
    onSpinComplete: function (intensity) {
        console.log('[DIAG] PartyMode.onSpinComplete intensity:', intensity);
        if (this._disposed) {
            console.log('[DIAG] onSpinComplete: disposed, skipping');
            return;
        }
        this.triggerFlash(intensity);
        this.playFanfare(intensity);
        this.spawnEmojis(intensity);
        if (intensity >= 3) {
            this.triggerChaos();
        }
    },

    /**
     * Chaos mode: all page elements fly WILDLY around — full 360° spins,
     * far off-screen translations, scale oscillation.
     * Winner stays centered and zoomed.
     */
    triggerChaos: function () {
        console.log('[DIAG] PartyMode.triggerChaos');
        var body = document.body;
        body.classList.add('party-chaos-active');

        var allElements = document.querySelectorAll('.glass-card, .form-control, .btn, h1, h2, h3, p, label, nav, footer, .navbar, .wheel-wrapper, canvas');
        var winnerEl = document.querySelector('.winner-highlight');

        allElements.forEach(function (el) {
            if (el === winnerEl || (winnerEl && winnerEl.contains(el))) return;
            el.classList.add('chaos-fly');
            // EXTREME random transforms — far offscreen, full rotation
            var rx = (Math.random() - 0.5) * 600;
            var ry = (Math.random() - 0.5) * 400;
            var rot = (Math.random() - 0.5) * 720;
            var scale = Math.random() * 2;
            el.style.setProperty('--chaos-x', rx + 'px');
            el.style.setProperty('--chaos-y', ry + 'px');
            el.style.setProperty('--chaos-rot', rot + 'deg');
            el.style.setProperty('--chaos-scale', scale);
        });

        if (winnerEl) {
            winnerEl.classList.add('chaos-winner-zoom');
        }

        // Calm down after 5 seconds
        setTimeout(function () {
            body.classList.remove('party-chaos-active');
            allElements.forEach(function (el) {
                el.classList.remove('chaos-fly');
                el.style.removeProperty('--chaos-x');
                el.style.removeProperty('--chaos-y');
                el.style.removeProperty('--chaos-rot');
                el.style.removeProperty('--chaos-scale');
            });
            if (winnerEl) {
                winnerEl.classList.remove('chaos-winner-zoom');
            }
        }, 5000);
    },

    /**
     * Load party state from localStorage.
     * @returns {{ enabled: boolean, intensity: number }}
     */
    loadState: function () {
        try {
            var raw = localStorage.getItem('supportwheel-party');
            if (raw) {
                var state = JSON.parse(raw);
                // Always start disabled on page load — intensity is remembered
                return { enabled: false, intensity: state.intensity || 1 };
            }
        } catch (e) { }
        return { enabled: false, intensity: 1 };
    },

    /**
     * Save party state to localStorage.
     */
    saveState: function (enabled, intensity) {
        try {
            localStorage.setItem('supportwheel-party', JSON.stringify({ enabled: enabled, intensity: intensity }));
        } catch (e) { }
    },

    /**
     * Cleanup all effects, stop audio, remove overlays.
     */
    dispose: function () {
        this._disposed = true;
        if (this._drumTimeout) {
            clearTimeout(this._drumTimeout);
            this._drumTimeout = null;
        }
        if (this._emojiContainer && this._emojiContainer.parentElement) {
            this._emojiContainer.parentElement.removeChild(this._emojiContainer);
            this._emojiContainer = null;
        }
    }
};

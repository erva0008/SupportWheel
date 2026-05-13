/**
 * Wheel canvas animation for Spin the Wheel.
 * Called from Blazor WASM via JS interop.
 *
 * Multiple pointers (one per winner) are drawn on canvas, aligned to
 * the actual winner segment positions. Winners are arranged on the wheel
 * via _arrangeItems so each one lands under a pointer when the spin stops.
 */
window.WheelCanvas = {
    _animFrameId: null,
    _delayTimeoutId: null,
    _pulseFrameId: null,

    _cancelPending: function () {
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
        if (this._delayTimeoutId) {
            clearTimeout(this._delayTimeoutId);
            this._delayTimeoutId = null;
        }
        if (this._pulseFrameId) {
            cancelAnimationFrame(this._pulseFrameId);
            this._pulseFrameId = null;
        }
    },

    _startConfetti: function (canvasId) {
        var wheelCanvas = document.getElementById(canvasId);
        if (!wheelCanvas) return;

        var overlay = document.createElement('canvas');
        overlay.width = wheelCanvas.width;
        overlay.height = wheelCanvas.height;
        overlay.style.position = 'absolute';
        overlay.style.top = wheelCanvas.offsetTop + 'px';
        overlay.style.left = wheelCanvas.offsetLeft + 'px';
        overlay.style.width = wheelCanvas.clientWidth + 'px';
        overlay.style.height = wheelCanvas.clientHeight + 'px';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '1000';
        wheelCanvas.parentElement.style.position = 'relative';
        wheelCanvas.parentElement.appendChild(overlay);

        var ctx = overlay.getContext('2d');
        var cx = overlay.width / 2;
        var cy = overlay.height / 2;
        var colors = ['#a78bfa', '#7c5cfc', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
        var particles = [];

        for (var i = 0; i < 80; i++) {
            var angle = Math.random() * 2 * Math.PI;
            var speed = 3 + Math.random() * 6;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 4 + Math.random() * 6,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                opacity: 1,
                isCircle: Math.random() > 0.5
            });
        }

        var frame = 0;
        var totalFrames = 180;

        function animateConfetti() {
            frame++;
            if (frame > totalFrames) {
                overlay.remove();
                return;
            }

            ctx.clearRect(0, 0, overlay.width, overlay.height);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15;
                p.rotation += p.rotationSpeed;
                p.opacity = Math.max(0, 1 - frame / totalFrames);

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;

                if (p.isCircle) {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, 2 * Math.PI);
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                }

                ctx.restore();
            }

            requestAnimationFrame(animateConfetti);
        }

        requestAnimationFrame(animateConfetti);
    },

    /**
     * Arrange items for display so that winners are evenly spaced on the wheel.
     * Returns { displayItems, winnerDisplayIndices } where winnerDisplayIndices[j]
     * is the display-order index for winner j.
     */
    _arrangeItems: function (items, selectedIndices) {
        const N = items.length;
        const K = selectedIndices.length;

        // Target display positions for each winner — evenly spaced
        const winnerPositions = [];
        for (let j = 0; j < K; j++) {
            winnerPositions.push(Math.floor(j * N / K));
        }

        const winnerPosSet = new Set(winnerPositions);
        const selectedSet = new Set(selectedIndices);
        const displayItems = new Array(N);
        const originalIndices = new Array(N);

        // Place winners at their target positions
        for (let j = 0; j < K; j++) {
            displayItems[winnerPositions[j]] = items[selectedIndices[j]];
            originalIndices[winnerPositions[j]] = selectedIndices[j];
        }

        // Fill non-winners in remaining slots, preserving their relative order
        let ni = 0;
        for (let pos = 0; pos < N; pos++) {
            if (winnerPosSet.has(pos)) continue;
            while (selectedSet.has(ni)) ni++;
            displayItems[pos] = items[ni];
            originalIndices[pos] = ni;
            ni++;
        }

        return { displayItems: displayItems, winnerDisplayIndices: winnerPositions, originalIndices: originalIndices };
    },

    /**
     * Generate a modern color palette using HSL for consistent saturation/lightness.
     * Returns an array of CSS color strings.
     */
    _generateColors: function (count) {
        const colors = [];
        // Golden-angle offset for maximal hue separation
        const goldenAngle = 137.508;
        for (let i = 0; i < count; i++) {
            const hue = (i * goldenAngle) % 360;
            colors.push('hsl(' + hue + ', 68%, 58%)');
        }
        return colors;
    },

    /**
     * Render one static frame of the wheel (segments + outer ring + center circle).
     * Does NOT draw pointers — callers are responsible for that.
     * Shared by startSpin's drawWheel and drawIdle.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} size          - Canvas width/height in px
     * @param {number} center        - center = size/2
     * @param {number} radius        - Wheel radius (excluding outer ring)
     * @param {number} segmentAngle  - Radians per segment (2π / N)
     * @param {number} N             - Total number of segments
     * @param {string[]} displayItems - Labels in display order
     * @param {string[]} colors      - CSS color per segment
     * @param {number} rotation      - Current wheel rotation in radians
     * @param {number} outerRingWidth - Width of the decorative outer ring in px
     */
    _renderFrame: function (ctx, size, center, radius, segmentAngle, N, displayItems, colors, rotation, outerRingWidth) {
        function lightenColor(color, amount) {
            var match = color.match(/hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
            if (match) {
                var h = parseFloat(match[1]);
                var s = parseFloat(match[2]);
                var l = Math.min(100, parseFloat(match[3]) + amount);
                return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
            }
            return color;
        }

        function truncateName(name) {
            return name.length > 12 ? name.substring(0, 11) + '\u2026' : name;
        }

        var fontSize = Math.max(12, Math.min(18, 200 / N));

        // Draw segments
        for (var i = 0; i < N; i++) {
            var startAng = rotation + segmentAngle * i;
            var endAng = startAng + segmentAngle;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAng, endAng);
            ctx.closePath();

            var midAngle = (startAng + endAng) / 2;
            var gx = center + radius * 0.5 * Math.cos(midAngle);
            var gy = center + radius * 0.5 * Math.sin(midAngle);
            var segGrad = ctx.createRadialGradient(center, center, radius * 0.15, gx, gy, radius);
            segGrad.addColorStop(0, lightenColor(colors[i % colors.length], 20));
            segGrad.addColorStop(1, colors[i % colors.length]);
            ctx.fillStyle = segGrad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
        }

        // Draw text labels on top of segments
        for (var i = 0; i < N; i++) {
            var startAng = rotation + segmentAngle * i;
            var midAng = startAng + segmentAngle / 2;
            var normalizedAng = ((midAng % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            var flipText = normalizedAng > Math.PI / 2 && normalizedAng < 3 * Math.PI / 2;
            ctx.save();
            ctx.translate(center, center);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + fontSize + 'px "Segoe UI", system-ui, sans-serif';
            if (flipText) {
                ctx.rotate(midAng + Math.PI);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.35)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(truncateName(displayItems[i]), -(radius - 18), 0);
            } else {
                ctx.rotate(midAng);
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.35)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(truncateName(displayItems[i]), radius - 18, 0);
            }
            ctx.restore();
        }

        // Draw outer decorative ring
        var outerR = radius + outerRingWidth;
        var grad = ctx.createRadialGradient(center, center, radius, center, center, outerR);
        grad.addColorStop(0, '#4a4a5a');
        grad.addColorStop(0.5, '#5c5c6e');
        grad.addColorStop(1, '#3a3a48');
        ctx.beginPath();
        ctx.arc(center, center, outerR, 0, 2 * Math.PI);
        ctx.arc(center, center, radius, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(center, center, outerR, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw center circle (no emoji — idle/spinning view)
        var centerR = 30;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(center, center, centerR, 0, 2 * Math.PI);
        var cGrad = ctx.createRadialGradient(
            center - centerR * 0.25, center - centerR * 0.25, centerR * 0.1,
            center, center, centerR
        );
        cGrad.addColorStop(0, '#ffffff');
        cGrad.addColorStop(1, '#e0e0e8');
        ctx.fillStyle = cGrad;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(center, center, centerR, 0, 2 * Math.PI);
        ctx.strokeStyle = '#4a4a5a';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(center, center, centerR - 3, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Start the spin animation.
     * @param {string} canvasId - The canvas element ID
     * @param {string[]} items - All items on the wheel
     * @param {number[]} selectedIndices - Indices of selected items (into items[])
     * @param {object} dotNetRef - DotNet object reference for callback
     */
    startSpin: function (canvasId, items, selectedIndices, dotNetRef) {
        this._cancelPending();

        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const self = this;
        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        const center = size / 2;
        const outerRingWidth = 8;
        const radius = size / 2 - 20 - outerRingWidth;
        const N = items.length;
        const K = selectedIndices.length;
        const segmentAngle = (2 * Math.PI) / N;

        // Rearrange items so winners are evenly distributed
        const arranged = this._arrangeItems(items, selectedIndices);
        const displayItems = arranged.displayItems;
        const winnerDisplayIndices = arranged.winnerDisplayIndices;
        const winnerDisplaySet = new Set(winnerDisplayIndices);
        const originalIndices = arranged.originalIndices;

        // Pointer angles — aligned to the actual winner segment center positions.
        // Winners sit at display indices winnerDisplayIndices[j], so each pointer
        // aims at that segment's center. This is only perfectly evenly spaced when
        // N is divisible by K; otherwise pointers follow the floor(j*N/K) spacing.
        const pointerAngles = [];
        for (let j = 0; j < K; j++) {
            pointerAngles.push(-Math.PI / 2 + winnerDisplayIndices[j] * segmentAngle);
        }

        // Final rotation: segment 0's center must align with pointer 0 (12 o'clock = -π/2)
        // Segment i center is at: rotation + (i + 0.5) * segmentAngle
        // For i=0, pointer at -π/2: rotation + 0.5 * segmentAngle = -π/2
        const finalAlignRotation = -Math.PI / 2 - 0.5 * segmentAngle;

        // Add 5–8 extra full spins for drama
        const extraRotations = 5 + Math.floor(Math.random() * 4);
        const totalRotation = finalAlignRotation + extraRotations * 2 * Math.PI;

        const baseColors = this._generateColors(N);
        const colors = originalIndices.map(oi => baseColors[oi]);

        const duration = 5000;
        let startTime = null;

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function truncateName(name) {
            return name.length > 12 ? name.substring(0, 11) + '\u2026' : name;
        }

        /** Draw the outer decorative ring around the wheel. */
        function drawOuterRing() {
            const outerR = radius + outerRingWidth;
            const grad = ctx.createRadialGradient(center, center, radius, center, center, outerR);
            grad.addColorStop(0, '#4a4a5a');
            grad.addColorStop(0.5, '#5c5c6e');
            grad.addColorStop(1, '#3a3a48');

            ctx.beginPath();
            ctx.arc(center, center, outerR, 0, 2 * Math.PI);
            ctx.arc(center, center, radius, 0, 2 * Math.PI, true);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            // Subtle inner highlight
            ctx.beginPath();
            ctx.arc(center, center, outerR, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(center, center, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        /**
         * Draw pointer triangles on the canvas (fixed, not rotating).
         * @param {boolean} glow - Whether to draw pointers in glowing winner style
         */
        function drawPointers(glow) {
            var pointerLen = 20;
            var halfBase = 10;

            for (let j = 0; j < K; j++) {
                var angle = pointerAngles[j];

                // Tip points inward (toward center), base sits outside the wheel
                var tipR = radius - 4;
                var baseR = radius + outerRingWidth + pointerLen;

                var tipX = center + tipR * Math.cos(angle);
                var tipY = center + tipR * Math.sin(angle);

                // Perpendicular to the angle direction
                var perpX = -Math.sin(angle);
                var perpY = Math.cos(angle);

                var baseX = center + baseR * Math.cos(angle);
                var baseY = center + baseR * Math.sin(angle);

                // Drop shadow
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(baseX + halfBase * perpX, baseY + halfBase * perpY);
                ctx.lineTo(baseX - halfBase * perpX, baseY - halfBase * perpY);
                ctx.closePath();

                if (glow) {
                    var glowGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
                    glowGrad.addColorStop(0, '#a78bfa');
                    glowGrad.addColorStop(1, '#60a5fa');
                    ctx.fillStyle = glowGrad;
                    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = 'rgba(124,92,252,0.7)';
                    ctx.shadowBlur = 14;
                } else {
                    var ptrGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
                    ptrGrad.addColorStop(0, '#2c2c3a');
                    ptrGrad.addColorStop(1, '#4a4a5a');
                    ctx.fillStyle = ptrGrad;
                    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                    ctx.lineWidth = 1.5;
                }

                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }

        function drawCenterCircle(emoji) {
            var centerR = 30;

            // Shadow under the center circle
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(center, center, centerR, 0, 2 * Math.PI);

            var cGrad = ctx.createRadialGradient(
                center - centerR * 0.25, center - centerR * 0.25, centerR * 0.1,
                center, center, centerR
            );
            cGrad.addColorStop(0, '#ffffff');
            cGrad.addColorStop(1, '#e0e0e8');
            ctx.fillStyle = cGrad;
            ctx.fill();
            ctx.restore();

            // Border ring
            ctx.beginPath();
            ctx.arc(center, center, centerR, 0, 2 * Math.PI);
            ctx.strokeStyle = '#4a4a5a';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Inner accent ring
            ctx.beginPath();
            ctx.arc(center, center, centerR - 3, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (emoji) {
                ctx.font = 'bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#333';
                ctx.fillText(emoji, center, center);
            }
        }

        /** Draw a single segment with gradient fill. */
        function drawSegment(index, startAng, endAng, color, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAng, endAng);
            ctx.closePath();

            // Subtle radial gradient for depth
            var midAngle = (startAng + endAng) / 2;
            var gx = center + radius * 0.5 * Math.cos(midAngle);
            var gy = center + radius * 0.5 * Math.sin(midAngle);
            var segGrad = ctx.createRadialGradient(center, center, radius * 0.15, gx, gy, radius);
            segGrad.addColorStop(0, lightenColor(color, 20));
            segGrad.addColorStop(1, color);
            ctx.fillStyle = segGrad;
            ctx.fill();

            // White separator
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.globalAlpha = 1.0;
            ctx.restore();
        }

        /** Lighten a CSS color string by the given percentage. Works for hsl() strings. */
        function lightenColor(color, amount) {
            // Parse hsl(h, s%, l%)
            var match = color.match(/hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
            if (match) {
                var h = parseFloat(match[1]);
                var s = parseFloat(match[2]);
                var l = Math.min(100, parseFloat(match[3]) + amount);
                return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
            }
            return color;
        }

        /** Draw text label for a segment with shadow for readability. */
        function drawSegmentText(startAng, text, style) {
            var midAng = startAng + segmentAngle / 2;
            var normalizedAng = ((midAng % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            var flipText = normalizedAng > Math.PI / 2 && normalizedAng < 3 * Math.PI / 2;
            ctx.save();
            ctx.translate(center, center);
            ctx.fillStyle = style.color;
            ctx.font = style.font;
            if (flipText) {
                ctx.rotate(midAng + Math.PI);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                // Text shadow for contrast
                ctx.shadowColor = 'rgba(0,0,0,0.35)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(truncateName(text), -(radius - 18), 0);
            } else {
                ctx.rotate(midAng);
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                // Text shadow for contrast
                ctx.shadowColor = 'rgba(0,0,0,0.35)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(truncateName(text), radius - 18, 0);
            }
            ctx.restore();
        }

        function drawWheel(rotation) {
            ctx.clearRect(0, 0, size, size);
            WheelCanvas._renderFrame(ctx, size, center, radius, segmentAngle, N, displayItems, colors, rotation, outerRingWidth);
            drawPointers(false);
        }

        /**
         * Draw the wheel with winners highlighted.
         * @param {number} rotation - Final rotation angle
         * @param {number} highlightIndex - Which winner in sequence to pulse (-1 = all steady)
         * @param {number} pulseScale - Pulse intensity 0..1
         */
        function drawHighlighted(rotation, highlightIndex, pulseScale) {
            ctx.clearRect(0, 0, size, size);

            var fontSize = Math.max(12, Math.min(18, 200 / N));

            // Draw all segments
            for (let i = 0; i < N; i++) {
                var startAng = rotation + segmentAngle * i;
                var endAng = startAng + segmentAngle;
                var isWinner = winnerDisplaySet.has(i);
                var winnerSeqIdx = winnerDisplayIndices.indexOf(i);
                var isPulsing = (highlightIndex >= 0 && winnerSeqIdx === highlightIndex) ||
                    (highlightIndex === -2 && isWinner);

                if (isWinner) {
                    ctx.beginPath();
                    ctx.moveTo(center, center);
                    ctx.arc(center, center, radius, startAng, endAng);
                    ctx.closePath();

                    // Rich gold gradient for winners
                    var midAngle = (startAng + endAng) / 2;
                    var gx = center + radius * 0.5 * Math.cos(midAngle);
                    var gy = center + radius * 0.5 * Math.sin(midAngle);
                    var winGrad = ctx.createRadialGradient(center, center, radius * 0.1, gx, gy, radius);

                    if (isPulsing) {
                        var alpha = 0.8 + 0.2 * pulseScale;
                        winGrad.addColorStop(0, 'rgba(255,245,180,' + alpha + ')');
                        winGrad.addColorStop(0.5, 'rgba(255,215,0,' + alpha + ')');
                        winGrad.addColorStop(1, 'rgba(255,180,0,' + alpha + ')');
                    } else {
                        winGrad.addColorStop(0, '#FFF5B4');
                        winGrad.addColorStop(0.5, '#FFD700');
                        winGrad.addColorStop(1, '#FFB400');
                    }

                    ctx.fillStyle = winGrad;
                    ctx.fill();

                    // Glow effect for pulsing
                    if (isPulsing) {
                        ctx.save();
                        ctx.shadowColor = 'rgba(255,180,0,0.6)';
                        ctx.shadowBlur = 12 + 8 * pulseScale;
                        ctx.strokeStyle = '#FF6B35';
                        ctx.lineWidth = 4 + 3 * pulseScale;
                        ctx.stroke();
                        ctx.restore();
                    } else {
                        ctx.strokeStyle = '#E6A800';
                        ctx.lineWidth = 3;
                        ctx.stroke();
                    }
                } else {
                    drawSegment(i, startAng, endAng, colors[i % colors.length], 0.3);
                }
            }

            // Draw text on top
            for (let i = 0; i < N; i++) {
                var startAng = rotation + segmentAngle * i;
                var isWinner = winnerDisplaySet.has(i);
                var winnerSeqIdx = winnerDisplayIndices.indexOf(i);
                var isPulsing = (highlightIndex >= 0 && winnerSeqIdx === highlightIndex) ||
                    (highlightIndex === -2 && isWinner);

                if (isPulsing) {
                    drawSegmentText(startAng, displayItems[i], {
                        color: '#1a1a1a',
                        font: 'bold ' + (fontSize + 4 + 2 * pulseScale) + 'px "Segoe UI", system-ui, sans-serif'
                    });
                } else if (isWinner) {
                    drawSegmentText(startAng, displayItems[i], {
                        color: '#2c2c2c',
                        font: 'bold ' + (fontSize + 2) + 'px "Segoe UI", system-ui, sans-serif'
                    });
                } else {
                    drawSegmentText(startAng, displayItems[i], {
                        color: 'rgba(255,255,255,0.5)',
                        font: fontSize + 'px "Segoe UI", system-ui, sans-serif'
                    });
                }
            }

            drawOuterRing();
            drawCenterCircle('\uD83C\uDF89');
            drawPointers(true);
        }

        /**
         * Sequential pulse animation — highlights each winner one by one,
         * then settles into a steady highlighted state.
         */
        function startWinnerPulse(finalRotation) {
            var pulseDuration = 600;
            var pulseStart = performance.now();
            var totalPulseTime = pulseDuration * K;

            function pulseFrame(now) {
                var elapsed = now - pulseStart;

                if (elapsed >= totalPulseTime) {
                    // Transition to continuous subtle pulse for all winners
                    startContinuousPulse(finalRotation, now);
                    return;
                }

                var winnerIdx = Math.floor(elapsed / pulseDuration);
                var t = (elapsed % pulseDuration) / pulseDuration;
                var scale = Math.sin(t * Math.PI);

                drawHighlighted(finalRotation, winnerIdx, scale);
                self._pulseFrameId = requestAnimationFrame(pulseFrame);
            }

            self._pulseFrameId = requestAnimationFrame(pulseFrame);
        }

        function startContinuousPulse(finalRotation, startNow) {
            var continuousStart = startNow;

            function continuousFrame(now) {
                var elapsed = now - continuousStart;
                // ~1.5 Hz oscillation
                var scale = 0.15 + 0.15 * Math.sin(elapsed * (2 * Math.PI * 1.5) / 1000);
                drawHighlighted(finalRotation, -2, scale);
                self._pulseFrameId = requestAnimationFrame(continuousFrame);
            }

            self._pulseFrameId = requestAnimationFrame(continuousFrame);
        }

        function animate(now) {
            if (!startTime) startTime = now;
            var elapsed = now - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var easedProgress = easeOutCubic(progress);
            var currentRotation = easedProgress * totalRotation;

            if (progress < 1) {
                drawWheel(currentRotation);
                self._animFrameId = requestAnimationFrame(animate);
            } else {
                self._animFrameId = null;

                startWinnerPulse(currentRotation);
                self._startConfetti(canvasId);

                if (dotNetRef) {
                    dotNetRef.invokeMethodAsync('OnSpinComplete');
                }
            }
        }

        self._animFrameId = requestAnimationFrame(animate);
    },

    /**
     * Draw the wheel statically at rotation=0 with no animation.
     * Cancels any pending animation before drawing.
     *
     * @param {string} canvasId       - The canvas element ID
     * @param {string[]} items        - All items on the wheel
     * @param {number[]} selectedIndices - Indices of the "selected" items (determines pointer placement)
     */
    drawIdle: function (canvasId, items, selectedIndices) {
        this._cancelPending();

        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        const center = size / 2;
        const outerRingWidth = 8;
        const radius = size / 2 - 20 - outerRingWidth;
        const N = items.length;
        const segmentAngle = (2 * Math.PI) / N;

        const baseColors = this._generateColors(N);

        // Render static frame at rotation=0
        ctx.clearRect(0, 0, size, size);
        WheelCanvas._renderFrame(ctx, size, center, radius, segmentAngle, N, items, baseColors, 0, outerRingWidth);
    }
};

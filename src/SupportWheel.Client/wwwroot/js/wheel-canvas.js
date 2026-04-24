/**
 * Wheel canvas animation for Spin the Wheel.
 * Called from Blazor WASM via JS interop.
 */
window.WheelCanvas = {
    /**
     * Start the spin animation.
     * @param {string} canvasId - The canvas element ID
     * @param {string[]} items - All items on the wheel
     * @param {number[]} selectedIndices - Indices of selected items
     * @param {object} dotNetRef - DotNet object reference for callback
     */
    startSpin: function (canvasId, items, selectedIndices, dotNetRef) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        const center = size / 2;
        const radius = size / 2 - 20;
        const segmentCount = items.length;
        const segmentAngle = (2 * Math.PI) / segmentCount;

        // Color palette
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#D7BDE2',
            '#A3E4D7', '#FAD7A0', '#A9CCE3', '#D5F5E3', '#FADBD8'
        ];

        // Calculate target rotation so the first selected segment ends up at the pointer (top).
        // The pointer is at the top of the canvas (angle = -PI/2).
        // Each segment i spans from segmentAngle*i to segmentAngle*(i+1), with center at segmentAngle*i + segmentAngle/2.
        // We rotate the wheel by totalRotation. After rotation, segment i's center is at segmentAngle*i + segmentAngle/2 + totalRotation.
        // We want that to equal -PI/2 (mod 2*PI), i.e. the pointer position.
        const targetSegmentIndex = selectedIndices[0];
        const targetSegmentCenter = segmentAngle * targetSegmentIndex + segmentAngle / 2;
        // We need: targetSegmentCenter + totalRotation ≡ -PI/2 (mod 2*PI)
        // totalRotation = -PI/2 - targetSegmentCenter + N * 2*PI
        const extraRotations = 5 + Math.random() * 3; // 5-8 full spins
        const alignOffset = (-Math.PI / 2 - targetSegmentCenter) % (2 * Math.PI) + extraRotations * 2 * Math.PI;
        // Ensure positive total rotation (clockwise visual spin)
        const totalRotation = alignOffset > 0 ? alignOffset : alignOffset + 2 * Math.PI;

        const duration = 5000; // 5 seconds
        const startTime = performance.now();

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function drawWheel(rotation) {
            ctx.clearRect(0, 0, size, size);

            for (let i = 0; i < segmentCount; i++) {
                const startAngle = rotation + segmentAngle * i;
                const endAngle = startAngle + segmentAngle;

                // Segment fill
                ctx.beginPath();
                ctx.moveTo(center, center);
                ctx.arc(center, center, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();

                // Segment border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Text
                ctx.save();
                ctx.translate(center, center);
                ctx.rotate(startAngle + segmentAngle / 2);
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#333';
                ctx.font = `bold ${Math.max(12, Math.min(18, 200 / segmentCount))}px sans-serif`;

                let name = items[i];
                if (name.length > 12) name = name.substring(0, 11) + '\u2026';

                ctx.fillText(name, radius - 15, 0);
                ctx.restore();
            }

            // Center circle
            ctx.beginPath();
            ctx.arc(center, center, 25, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        function highlightWinners(rotation) {
            ctx.clearRect(0, 0, size, size);

            for (let i = 0; i < segmentCount; i++) {
                const startAngle = rotation + segmentAngle * i;
                const endAngle = startAngle + segmentAngle;
                const isWinner = selectedIndices.includes(i);

                ctx.beginPath();
                ctx.moveTo(center, center);
                ctx.arc(center, center, radius, startAngle, endAngle);
                ctx.closePath();

                if (isWinner) {
                    ctx.fillStyle = '#FFD700'; // Gold for winners
                    ctx.fill();
                    ctx.strokeStyle = '#FF8C00';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.globalAlpha = 0.4; // Dim non-winners
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Text
                ctx.save();
                ctx.translate(center, center);
                ctx.rotate(startAngle + segmentAngle / 2);
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isWinner ? '#333' : '#999';
                const fontSize = Math.max(12, Math.min(18, 200 / segmentCount));
                ctx.font = isWinner
                    ? `bold ${fontSize + 2}px sans-serif`
                    : `${fontSize}px sans-serif`;

                let name = items[i];
                if (name.length > 12) name = name.substring(0, 11) + '\u2026';

                ctx.fillText(name, radius - 15, 0);
                ctx.restore();
            }

            // Center circle
            ctx.beginPath();
            ctx.arc(center, center, 25, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Center emoji
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#333';
            ctx.fillText('\uD83C\uDF89', center, center);
        }

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            const currentRotation = easedProgress * totalRotation;

            if (progress < 1) {
                drawWheel(currentRotation);
                requestAnimationFrame(animate);
            } else {
                // Animation complete — highlight winners
                highlightWinners(currentRotation);

                // Notify Blazor
                if (dotNetRef) {
                    dotNetRef.invokeMethodAsync('OnSpinComplete');
                }
            }
        }

        // Initial draw, then start animation after a brief pause
        drawWheel(0);
        setTimeout(function () { requestAnimationFrame(animate); }, 500);
    }
};

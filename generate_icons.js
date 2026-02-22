const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background Circle
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(1, '#8e44ad');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Stylized Gesture Trail (G shape)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(size * 0.7, size * 0.3);
    ctx.lineTo(size * 0.3, size * 0.3);
    ctx.lineTo(size * 0.3, size * 0.7);
    ctx.lineTo(size * 0.7, size * 0.7);
    ctx.lineTo(size * 0.7, size * 0.5);
    ctx.lineTo(size * 0.5, size * 0.5);
    ctx.stroke();

    return canvas.toBuffer('image/png');
}

// In a real environment, we'd save these. Since I can't generate binary images directly with code execution easily without 'canvas' pkg installed,
// I will instead provide the manifest update and the visual drawing recorder for the options page.

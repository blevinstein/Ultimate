const {
    project3d
} = require('./math_utils.js');

module.exports.drawPath = (frameBuffer, path, alpha = 1, color = 'white') => {
    const screenPath = path.map(point => project3d(point.position));
    frameBuffer.drawOperation(1, context => {
        context.globalAlpha = alpha;
        context.strokeStyle = color;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(...screenPath[0]);
        for (let i = 1; i < screenPath.length; i++) {
            context.lineTo(...screenPath[i]);
        }
        context.stroke();
        context.globalAlpha = 1;
    });
};
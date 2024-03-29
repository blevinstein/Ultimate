const {
  add3d,
  project3d
} = require('./math_utils.js');

module.exports.ToastService = class ToastService {
  constructor() {
    this.toasts = [];
  }

  addToast(text, position, velocity, color, lifetime, accentColor = 'white') {
    this.toasts.push({
      text,
      position,
      velocity,
      color,
      lifetime,
      accentColor
    });
  }

  update() {
    for (let i = 0; i < this.toasts.length; i++) {
      this.toasts[i].position =
        add3d(this.toasts[i].position, this.toasts[i].velocity);
      if (this.toasts[i].lifetime && --this.toasts[i].lifetime <= 0) {
        this.toasts.splice(i--, 1);
      }
    }
  }

  draw(frameBuffer) {
    for (let toast of this.toasts) {
      frameBuffer.drawOperation(toast.position[1], context => {
        context.font = '8px retroFont';
        const textMetrics = context.measureText(toast.text);
        const screenPosition = project3d(toast.position);
        window.textMetrics = textMetrics;
        context.lineWidth = 2;
        if (toast.accentColor) {
          context.strokeStyle = toast.accentColor;
          context.strokeText(
            toast.text, screenPosition[0] - textMetrics.width / 2,
            screenPosition[1] - textMetrics.actualBoundingBoxAscent);
        }
        context.fillStyle = toast.color;
        context.fillText(toast.text, screenPosition[0] - textMetrics
          .width / 2,
          screenPosition[1]
          - textMetrics.actualBoundingBoxAscent);
      });
    }
  }
};
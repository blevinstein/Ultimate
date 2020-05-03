module.exports.ConsoleToastService = class ConsoleToastService {
  addToast(text, position, velocity, color, lifetime, accentColor = 'white') {
    console.log(text);
  }

  update() {}

  draw(frameBuffer) {}
};
const {
    Game
} = require('./game.js');
const {
    STATES
} = require('./game_params.js');
const {
    ConsoleToastService
} = require('./console_toast_service.js');

const game = new Game().setToastService(new ConsoleToastService());

while (game.state != STATES.GameOver) {
    game.update();
}
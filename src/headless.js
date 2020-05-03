const {
    Coach
} = require('./coach.js');
const {
    Game
} = require('./game.js');
const {
    STATES
} = require('./game_params.js');
const {
    ConsoleToastService
} = require('./console_toast_service.js');
const {
    ZoneDefenseStrategy
} = require('./strategy/zone_defense.js');

const game = new Game(null, null, [new Coach(), new Coach(undefined, (game, team) => new ZoneDefenseStrategy(game, team))]);


let zoneWins = 0;
let manWins = 0;
for (let i = 0; i < 100; i++) {
    game.reset();
    while (game.state != STATES.GameOver) {
        game.update();
    }
    if (game.teams[0].score === game.teams[1].score) {
        throw new Error('Tie game should never happen!');
    }
    if (game.teams[0].score > game.teams[1].score) {
        ++manWins;
    } else {
        ++zoneWins;
    }
    console.log('.');
}

console.log(`Results: man-to-man ${manWins} zone ${zoneWins}`);
const {
    Coach
} = require('./coach.js');
const {
    Disc
} = require('./disc.js');
const {
    Game
} = require('./game.js');
const {
    ZoneDefenseStrategy
} = require('./strategy/zone_defense.js');

let initialized = false;

window.initialize = () => {
    console.log('Initializing...');


    Game.loadResources().then(
        (resources) => {
            initialized = true;
            console.log('Initialized.');
            start(resources);
        },
        (error) => {
            console.log('Failed to initialize.');
            console.log(error);
        });
};

function start(resources) {
    window.game = new Game(resources, document.getElementById('canvas'), [
        new Coach(),
        new Coach(undefined, (game, team) => new ZoneDefenseStrategy(game, team)),
    ]);
    window.game.start();
}
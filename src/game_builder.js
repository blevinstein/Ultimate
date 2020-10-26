const {
  Coach
} = require('./coach.js');
const {
  Game
} = require('./game.js');
const { ManToManDefenseStrategy } = require('./strategy/man_defense.js');
const { ManualOffenseStrategy } = require('./strategy/manual_offense.js');
const { RandomOffenseStrategy } = require('./strategy/random_offense.js');
const { ZoneDefenseStrategy } = require('./strategy/zone_defense.js');
// GameBuilder
//
// async load resources, models, populations as necessary
// initialized state (boolean)
// build coaching strategies from config
// mapping from string name to builder function
//
// TODO: Support tensorflow and pytorch?
//
// 'static': {
//   'offense': 'Strategy',
//   'defense': 'Strategy',
//   ['aerial': 'Strategy',]
//  }
//  'models': [
//    {'path': 'model_1.json'},
//    ...
//  ]
//  'model_population: {
//    'path': 'population_path/'
//  }
//  'double_model_population: {
//    'path': 'population_path/'
//  }

/**
 * Encapsulates async loading of sprite resources and coach-related data (e.g.
 * models).
 */
module.exports.GameBuilder = class GameBuilder {
  constructor() {
    this.strategyMap = new Map;
  }

  registerStrategy(name, builder) {
    this.strategyMap.set(name, builder);
  }

  getStrategy(name) {
    if (!this.strategyMap.has(name)) {
      throw new Error(`Unexpected strategy: ${name}`);
    }
    return this.strategyMap.get(name);
  }

  static defaultBuilder() {
    const builder = new GameBuilder();
    builder.registerStrategy('ManualOffense', (game, team) => new ManualOffenseStrategy(game, team));
    builder.registerStrategy('RandomOffense', (game, team) => new RandomOffenseStrategy(game, team));
    builder.registerStrategy('ManToManDefense', (game, team) => new ManToManDefenseStrategy(game, team));
    builder.registerStrategy('ZoneDefense', (game, team) => new ZoneDefenseStrategy(game, team));
    return builder;
  }

  defaultInitialize(configPromise, canvas) {
    return async () => {
      try {
        console.log('Initializing...');
        const config = await configPromise;
        window.config  = config;
        console.log(`Config: ${JSON.stringify(config)}`);
        const coachList = await Promise.all(config.coach.map(coachConfig => {
          switch (coachConfig.type) {
            case 'static':
              if (!coachConfig.strategy) {
                throw new Error(`Missing strategy: ${JSON.stringify(coachConfig)}`);
              }
              return new Coach(...coachConfig.strategy.map(this.getStrategy.bind(this)));
              break;
            default:
              throw new Error('Unexpected coach type');
          }
        }));
        console.log('Coaches ready');
        const resources = await Game.loadResources();
        console.log('Sprites ready');

        const game = new Game(resources, canvas, coachList);
        game.start();
        return game;
      } catch (error) {
        console.log('Failed to initialize.');
        console.log(error);
      }
    }
  }
}

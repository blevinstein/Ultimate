
const {STATES} = require('./game_params.js');
const {ClosestPickupStrategy} = require('./strategy/closest_pickup.js');
const {IdleStrategy} = require('./strategy/idle.js');
const {KickoffStrategy} = require('./strategy/kickoff.js');
const {LineupStrategy} = require('./strategy/lineup.js');
const {ManToManDefenseStrategy} = require('./strategy/man_defense.js');
const {ManualOffenseStrategy} = require('./strategy/manual_offense.js');
const {RandomOffenseStrategy} = require('./strategy/random_offense.js');

module.exports.Coach = class Coach {
  constructor(offensiveStrategy, defensiveStrategy, aerialStrategy) {
    this.offensiveStrategy =
        offensiveStrategy ||
        ((game, team) => new RandomOffenseStrategy(game, team));
    this.defensiveStrategy =
        defensiveStrategy ||
        ((game, team) => new ManToManDefenseStrategy(game, team));
    this.aerialStrategy =
        aerialStrategy ||
        ((game, team) => team.onOffense ? new ClosestPickupStrategy(game, team)
                                        : this.defensiveStrategy(game, team));
  }

  pickStrategy(game, team) {
    switch (game.state) {
    case STATES.Kickoff:
      if (!team.onOffense) {
        if (team.hasDisc()) {
          return new KickoffStrategy(game, team);
        } else {
          return new ClosestPickupStrategy(game, team);
        }
      } else {
        return new IdleStrategy(game, team);
      }
      break;
    case STATES.Receiving:
    case STATES.Pickup:
      if (team.onOffense) {
        return new ClosestPickupStrategy(game, team);
      } else {
        return this.defensiveStrategy(game, team);
      }
    case STATES.Normal:
      if (game.disc.isLoose()) {
        return this.aerialStrategy(game, team);
      } else {
        if (team.onOffense) {
          return this.offensiveStrategy(game, team);
          /*
          // player vs computer
          return team == game.teams[0]
              ? new RandomOffenseStrategy(game, team)
              : new ManualOffenseStrategy(game, team);
          */
        } else {
          return this.defensiveStrategy(game, team);
        }
      }
    case STATES.Reset:
      return new LineupStrategy(game, team);
    case STATES.GameOver:
      // TODO: More fun behavior? High fives, celebrations?
      return new LineupStrategy(game, team);
    }
    throw new Error('Unexpected state: ' + game.state);
  }
}

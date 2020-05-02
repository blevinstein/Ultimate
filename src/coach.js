
import {STATES} from './game.js';
import {ClosestPickupStrategy} from './strategy/closest_pickup.js';
import {IdleStrategy} from './strategy/idle.js';
import {KickoffStrategy} from './strategy/kickoff.js';
import {LineupStrategy} from './strategy/lineup.js';
import {ManToManDefenseStrategy} from './strategy/man_defense.js';
import {ManualOffenseStrategy} from './strategy/manual_offense.js';
import {RandomOffenseStrategy} from './strategy/random_offense.js';

export class Coach {
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


import { dist2d, mag2d, sub2d, getVector, magnitudeAlong2d, inverseProject2d } from '../math_utils.js';
import { Disc } from '../disc.js';
import { Game } from '../game.js';
import { Player, ARM_HEIGHT, MAX_THROW_SPEED } from '../player.js';
import { RangeFinderFactory } from '../range_finder.js';
import { Strategy } from './strategy.js';

const NUM_CANDIDATE_ROUTES = 10;
const GOAL_RADIUS = 2;

const MAX_HANDLE_OFFSET = 0.1;


// Totally uncoordinated scramble. Players look for open areas of the field,
// from 10m behind the handler to back of the endzone. Handler throws when and
// where the user clicks.
export class ManualOffenseStrategy extends Strategy {
  constructor(game, team) {
    super(game, team);
    this.destinationMap = new Map;
    this.rangeFinder = RangeFinderFactory.create(MAX_THROW_SPEED);
    this.throwTarget = null;
    game.canvas.onclick = event => {
      this.throwTarget = inverseProject2d(mul2d(
          sub2d([event.offsetX, event.offsetY], game.fieldOffset), 1 / game.fieldScale));
    };
  }

  chooseDestination() {
    const thrower = this.game.playerWithDisc();
    if (!thrower) { return null; }
    const defensivePlayers = this.game.defensiveTeam().players;
    const [minX, maxX] = this.team.goalDirection === 'E'
        ? [thrower.position[0] - 5, 110]
        : [0, thrower.position[0] + 5];
    let bestDestination;
    let bestClosestDefenderDistance;
    for (let i = 0; i < NUM_CANDIDATE_ROUTES; i++) {
      // Choose a random location no more than 5 yards behind the thrower
      let newDestination =
          [minX + Math.random() * (maxX - minX), Math.random() * 40];
      let closestDefenderDistance = Game.getClosestPlayer(this.game.defensiveTeam().players, newDestination)[1];
      if (!bestDestination || closestDefenderDistance > bestClosestDefenderDistance) {
        bestDestination = newDestination;
        bestClosestDefenderDistance = closestDefenderDistance;
      }
    }
    return bestDestination;
  }

  update() {
    if (!this.team.onOffense || this.game.disc.isLoose()) { return true; }

    for (let player of this.team.players) {
      if (player.hasDisc) {
        // Thrower behavior
        if (!this.throwTarget
            || dist3d(this.game.disc.position, player.desiredHandlePosition()) > MAX_HANDLE_OFFSET) {
          player.rest(getVector(this.team.goalDirection));
          continue;
        }

        let throwParams = this.rangeFinder.getThrowParams(
            sub2d(this.throwTarget, player.position));
        if (!throwParams) {
          console.log('Fallback to longest throw');
          throwParams = this.rangeFinder.getLongestThrowParams(
              sub2d(this.throwTarget, player.position));
        }

        if (!throwParams) { throw new Error('Failed to get throw params!'); }
        player.throw(...throwParams);
        this.throwTarget = null;
      } else {
        // Cutter behavior
        let destination = this.destinationMap.get(player) || this.chooseDestination();
        if (!destination) { continue; }
        if (dist2d(destination, player.position) < GOAL_RADIUS) {
          destination = null;
          player.rest();
        } else {
          player.move(sub2d(destination, player.position));
        }
        this.destinationMap.set(player, destination);
      }
    }
  }
}
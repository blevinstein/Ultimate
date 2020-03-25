
import { dist2d, mag2d, mul2d, sub2d, getVector, magnitudeAlong } from '../math_utils.js';
import { RangeFinder } from '../range_finder.js';
import { Strategy } from './strategy.js';

const NUM_CANDIDATES = 10;
const GOAL_RADIUS = 2;

// returns [player, distance]
function getClosestPlayer(team, location) {
  let closestPlayer;
  let closestPlayerDistance;
  for (let player of team.players) {
    let dist = dist2d(player.position, location);
    if (!closestPlayer || dist < closestPlayerDistance) {
      closestPlayer = player;
      closestPlayerDistance = dist;
    }
  }
  return [closestPlayer, closestPlayerDistance];
}

// Totally uncoordinated scramble. Players look for open areas of the field,
// from 10m behind the handler to back of the endzone.
export class RandomOffenseStrategy extends Strategy {
  static create(game, team) {
    return new RandomOffenseStrategy(game, team);
  }

  constructor(game, team) {
    super(game, team);
    this.destinationMap = new Map;
    this.rangeFinder = new RangeFinder(4);
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
    for (let i = 0; i < NUM_CANDIDATES; i++) {
      // Choose a random location no more than 5 yards behind the thrower
      let newDestination =
          [minX + Math.random() * (maxX - minX), Math.random() * 40];
      let closestDefenderDistance = getClosestPlayer(this.game.defensiveTeam(), newDestination)[1];
      if (!bestDestination || closestDefenderDistance > bestClosestDefenderDistance) {
        bestDestination = newDestination;
        bestClosestDefenderDistance = closestDefenderDistance;
      }
    }
    return bestDestination;
  }

  update() {
    if (!this.team.onOffense || this.game.disc.position) { return true; }

    for (let player of this.team.players) {
      if (player.hasDisc) {
        let bestDestination;
        let bestClosestDefenderDistance;
        let bestForwardProgress;
        for (let receiver of this.team.players) {
          if (player == receiver) { continue; }
          let destination = this.destinationMap.get(receiver);
          if (!destination) { continue; }
          let closestDefenderDistance = getClosestPlayer(this.game.defensiveTeam(), destination)[1];
          let forwardProgress = magnitudeAlong(sub2d(destination, player.position), getVector(this.team.goalDirection));
          if (!bestDestination || closestDefenderDistance > bestClosestDefenderDistance && forwardProgress > bestForwardProgress) {
            bestDestination = destination;
            bestClosestDefenderDistance = closestDefenderDistance;
            bestForwardProgress = forwardProgress;
          }
        }
        player.rest(getVector(this.team.goalDirection));
        if (bestDestination && bestClosestDefenderDistance > 5 && bestForwardProgress > 5) {
          let vector2d = sub2d(bestDestination, player.position);
          let [forward, upward] = this.rangeFinder.getParams(mag2d(vector2d));
          let vector3d = mul2d(vector2d, forward / mag2d(vector2d)).concat(upward);
          player.throw(vector3d);
        }
      } else {
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


import { dist2d, mag2d, sub2d, getVector, magnitudeAlong } from '../math_utils.js';
import { Disc } from '../disc.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { RangeFinder } from '../range_finder.js';
import { Strategy } from './strategy.js';

const NUM_CANDIDATES = 10;
const GOAL_RADIUS = 2;
const MAX_THROW_SPEED = 2;
const MIN_PROGRESS = 5;

// returns [player, distance]
function getClosestPlayer(players, location) {
  let closestPlayer;
  let closestPlayerDistance;
  for (let player of players) {
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
    this.rangeFinder = new RangeFinder(MAX_THROW_SPEED);
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
      let closestDefenderDistance = getClosestPlayer(this.game.defensiveTeam().players, newDestination)[1];
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
        // Thrower behavior
        const [minX, maxX] = this.team.goalDirection === 'E'
            ? [player.position[0] - 5, 110]
            : [0, player.position[0] + 5];
        let bestDestination;
        let bestForwardProgress;
        let bestVector;
        for (let i = 0; i < NUM_CANDIDATES; i++) {
          // Choose a random location no more than 5 yards behind the thrower
          let destination = [minX + Math.random() * (maxX - minX), Math.random() * 40];
          let closestDefenderDistance = getClosestPlayer(this.game.defensiveTeam().players, destination)[1];
          let [closestReceiver, closestReceiverDistance] = getClosestPlayer(this.team.players.filter(p => p != player), destination);
          if (closestReceiverDistance > closestDefenderDistance) { continue; }
          let runtime = Player.simulateRunTime(
              sub2d(destination, closestReceiver.position),
              closestReceiver.velocity);
          let vector = this.rangeFinder.getThrowVector(sub2d(destination, player.position), runtime);
          if (!vector) { continue; }
          let forwardProgress = magnitudeAlong(sub2d(destination, player.position), getVector(this.team.goalDirection));
          if (!bestDestination || forwardProgress > bestForwardProgress) {
            bestDestination = destination;
            bestForwardProgress = forwardProgress;
            bestVector = vector;
          }
        }
        if (bestDestination && bestForwardProgress > MIN_PROGRESS) {
          player.throw(bestVector);
        } else {
          player.rest(getVector(this.team.goalDirection));
        }
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


import {Disc} from '../disc.js';
import {Game} from '../game.js';
import {
  dist2d,
  getVector,
  mag2d,
  magnitudeAlong2d,
  sub2d
} from '../math_utils.js';
import {ARM_HEIGHT, MAX_THROW_SPEED, Player} from '../player.js';

import {Cutter} from './cutter.js';
import {Strategy} from './strategy.js';

const NUM_CANDIDATE_THROWS = 1;
const GOAL_RADIUS = 2;
const MIN_PROGRESS = 5;

// Totally uncoordinated scramble. Players look for open areas of the field,
// from 10m behind the handler to back of the endzone.
export class RandomOffenseStrategy extends Strategy {
  constructor(game, team) {
    super(game, team);
    this.destinationMap = new Map;
    this.pathsConsidered = [];
  }

  update() {
    if (!this.team.onOffense || this.game.disc.isLoose()) {
      return true;
    }

    for (let player of this.team.players) {
      if (player.hasDisc) {
        // Thrower behavior
        if (!player.canThrow()) {
          player.rest(getVector(this.team.goalDirection));
          continue;
        }
        const [minX, maxX] = this.team.goalDirection === 'E'
                                 ? [ player.position[0] - 5, 110 ]
                                 : [ 0, player.position[0] + 5 ];
        let bestDestination;
        let bestForwardProgress;
        let bestParams;
        for (let i = 0; i < NUM_CANDIDATE_THROWS; i++) {
          // Choose a random location no more than 5 yards behind the thrower
          let destination =
              [ minX + Math.random() * (maxX - minX), Math.random() * 40 ];
          let closestDefenderDistance = Game.getClosestPlayer(
              this.game.defensiveTeam().players, destination)[1];
          let [closestReceiver, closestReceiverDistance] =
              Game.getClosestPlayer(this.team.players.filter(p => p != player),
                                    destination);
          if (closestReceiverDistance > closestDefenderDistance) {
            continue;
          }
          let runTime = Player.simulateRunTime(
              sub2d(destination, closestReceiver.position),
              closestReceiver.velocity);
          let params = player.rangeFinder.getThrowParams(
              sub2d(destination, player.position), runTime);
          if (!params) {
            continue;
          }
          let path =
              Disc.simulateUntilGrounded(this.game.disc.position, params[0],
                                         Disc.createUpVector(...params), true)
                  .path;
          this.pathsConsidered.push(path);
          let interceptor =
              Disc.simulateInterceptions(this.game.disc.position, params[0],
                                         Disc.createUpVector(...params),
                                         this.game.defensiveTeam().players)[0];
          if (interceptor) {
            console.log('Defender would intercept throw.');
            continue;
          }
          let forwardProgress =
              magnitudeAlong2d(sub2d(destination, player.position),
                               getVector(this.team.goalDirection));
          if (!bestDestination || forwardProgress > bestForwardProgress) {
            bestDestination = destination;
            bestForwardProgress = forwardProgress;
            bestParams = params;
          }
        }
        if (bestDestination && bestForwardProgress > MIN_PROGRESS) {
          player.throw(...bestParams);
        } else {
          player.rest(getVector(this.team.goalDirection));
        }
      } else {
        // Cutter behavior
        let destination =
            this.destinationMap.get(player) ||
            Cutter.chooseBestRandomDestination(this.game, this.team);
        if (!destination) {
          continue;
        }
        this.moveWithin(player, destination);
        if (dist2d(destination, player.position) <= GOAL_RADIUS) {
          destination = null;
        }
        this.destinationMap.set(player, destination);
      }
    }

    for (let i = 0; i < this.pathsConsidered.length; i++) {
      this.drawPath(this.pathsConsidered[i],
                    Math.pow(0.9, this.pathsConsidered.length - i));
    }
  }
}

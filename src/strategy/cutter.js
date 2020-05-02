
const {Game} = require('../game.js');

module.exports.Cutter = class Cutter {

  // Choose the best from a sample of random locations no more than 5 yards
  // behind the thrower. This is potentially an appropriate location for a
  // cutter to run to.
  static chooseBestRandomDestination(game, team, numCandidateRoutes = 5) {
    const thrower = game.playerWithDisc();
    if (!thrower) {
      return null;
    }
    const defensivePlayers = game.defensiveTeam().players;
    const [minX, maxX] = team.goalDirection === 'E'
                             ? [ thrower.position[0] - 5, 110 ]
                             : [ 0, thrower.position[0] + 5 ];
    let bestDestination;
    let bestClosestDefenderDistance;
    for (let i = 0; i < numCandidateRoutes; i++) {
      // Choose a random location no more than 5 yards behind the thrower
      let newDestination =
          [ minX + Math.random() * (maxX - minX), Math.random() * 40 ];
      let closestDefenderDistance = Game.getClosestPlayer(
          game.defensiveTeam().players, newDestination)[1];
      if (!bestDestination ||
          closestDefenderDistance > bestClosestDefenderDistance) {
        bestDestination = newDestination;
        bestClosestDefenderDistance = closestDefenderDistance;
      }
    }
    return bestDestination;
  }
}

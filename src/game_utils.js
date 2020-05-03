const {
  dist2d,
} = require('./math_utils.js');

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

// Choose the best from a sample of random locations no more than 5 yards
// behind the thrower. This is potentially an appropriate location for a
// cutter to run to.
function chooseBestRandomDestination(game, team, numCandidateRoutes = 5) {
  const thrower = game.playerWithDisc();
  if (!thrower) {
    return null;
  }
  const defensivePlayers = game.defensiveTeam().players;
  const [minX, maxX] = team.goalDirection === 'E' ? [thrower.position[0] - 5,
    110
  ] : [0, thrower
    .position[0] + 5
  ];
  let bestDestination;
  let bestClosestDefenderDistance;
  for (let i = 0; i < numCandidateRoutes; i++) {
    // Choose a random location no more than 5 yards behind the thrower
    let newDestination = [minX + Math.random() * (maxX - minX), Math.random()
      * 40
    ];
    let closestDefenderDistance =
      getClosestPlayer(game.defensiveTeam().players, newDestination)[1];
    if (!bestDestination
      || closestDefenderDistance > bestClosestDefenderDistance) {
      bestDestination = newDestination;
      bestClosestDefenderDistance = closestDefenderDistance;
    }
  }
  return bestDestination;
}

function snapToBounds(position, bounds) {
  let result = position.slice(0, 2);
  if (result[0] < bounds[0][0]) {
    result[0] = bounds[0][0];
  }
  if (result[0] > bounds[0][1]) {
    result[0] = bounds[0][1];
  }
  if (result[1] < bounds[1][0]) {
    result[1] = bounds[1][0];
  }
  if (result[1] > bounds[1][1]) {
    result[1] = bounds[1][1];
  }
  return result;
}

function boundsCheck(position, bounds) {
  return bounds[0][0] <= position[0] && position[0] <= bounds[0][1]
    && bounds[1][0] <= position[1] && position[1] <= bounds[1][1];
}

module.exports = {
  getClosestPlayer,
  chooseBestRandomDestination,
  snapToBounds,
  boundsCheck
};

function getVector(kickoffDirection) {
  switch(kickoffDirection) {
    case 'E':
      return [1, 0];
    case 'W':
      return [-1, 0];
  }
}

export class ChargeStrategy {
  update(game, team) {
    for (let player of team.players) {
      player.move(getVector(team.goalDirection));
    }
  }
}

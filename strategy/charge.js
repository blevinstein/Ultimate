
function getVector(kickoffDirection) {
  switch(kickoffDirection) {
    case 'E':
      return [10, 0];
    case 'W':
      return [-10, 0];
  }
}

export class ChargeStrategy {
  update(game, team) {
    for (let player of team.players) {
      player.move(getVector(team.goalDirection));
    }
  }
}

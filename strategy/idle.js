
export class IdleStrategy {
  update(game, team) {
    for (let player of team.players) {
      player.rest();
    }
  }
}

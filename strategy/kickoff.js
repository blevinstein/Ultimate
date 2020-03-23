
function getVector(kickoffDirection) {
  switch(kickoffDirection) {
    case 'E':
      return [5, 2, 5];
    case 'W':
      return [-5, 2, 5];
  }
}

export class KickoffStrategy {
  update(game, team) {
    if (!team.hasDisc()) { console.log('Cannot pull without the disc!'); return; }
    const playerWithDisc = team.players.find(p => p.hasDisc);
    if (!playerWithDisc) { console.log('No player has the disc!!!'); return; }
    const vector = getVector(team.goalDirection);
    playerWithDisc.throw(vector);
  }
}

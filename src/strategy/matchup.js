const {
  dist2d
} = require('../math_utils.js');

module.exports.Matchup = class Matchup {
  constructor() {
    this.map = new Map;
  }

  match(a, b) {
    if (a.team == b.team) {
      console.log('Matching up against the wrong team!');
      return;
    }
    this.map.set(a, b);
    this.map.set(b, a);
  }

  swap(a, b) {
    if (a.team != b.team) {
      console.log('Switching with a player on the other team!');
      return;
    }
    const aMatch = this.map.get(a);
    const bMatch = this.map.get(b);
    this.match(a, bMatch);
    this.match(b, aMatch);
  }

  get(player) {
    return this.map.get(player);
  }

  static minMeanSquaredDistance(teams) {
    if (teams.length != 2) {
      console.log('Wrong number of teams!');
      return;
    }
    if (teams[0].players.length !== teams[1].players.length) {
      console.log('Unmatched team sizes!');
      return;
    }
    const numPlayers = teams[0].players.length;
    const matchup = new Matchup();
    for (let i = 0; i < numPlayers; i++) {
      matchup.match(teams[0].players[i], teams[1].players[i]);
    }
    // Swap to optimize
    let done = false;
    while (!done) {
      done = true;
      for (let i = 0; i < numPlayers; i++) {
        for (let j = i + 1; j < numPlayers; j++) {
          const a = teams[0].players[i];
          const b = teams[0].players[j];
          const aMatch = matchup.get(a);
          const bMatch = matchup.get(b);
          if (Math.pow(dist2d(a.position, bMatch.position), 2)
            + Math.pow(dist2d(b.position, aMatch.position), 2)
            < Math.pow(dist2d(a.position, aMatch.position), 2)
            + Math.pow(dist2d(b.position, bMatch.position), 2)) {
            matchup.swap(a, b);
            done = false;
          }
        }
      }
    }
    return matchup;
  }
}
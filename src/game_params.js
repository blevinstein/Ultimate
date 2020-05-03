module.exports = {
  STATES: {
    Kickoff: 'kickoff', // Waiting for defense to pull
    Receiving: 'receiving', // Waiting for pull to be caught or grounded
    Pickup: 'pickup', // Waiting for offense to pickup grounded disc
    Normal: 'normal', // Normal play; posession changes on grounded disc
    Reset: 'reset', // Waiting for players to return to the line after a score
    GameOver: 'gameover', // Game is over because one team has scored 11 points
  },

  FIELD_BOUNDS: [
    [0, 110],
    [0, 40]
  ],
  FIELD_BOUNDS_NO_ENDZONES: [
    [20, 90],
    [0, 40]
  ],
};
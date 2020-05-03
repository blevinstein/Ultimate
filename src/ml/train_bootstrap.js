const tf = require('@tensorflow/tfjs');
const flags = require('flags');

const {
  readFromFile
} = require('../csv_utils.js');

const TRAINING_DATA_LENGTH = 50000;

flags.defineString('input', '', 'File to read training data from');
flags.defineString('output', '', 'File to write trained model to');
flags.parse();

const ACTION_MODEL_INPUTS = [
  'state_pickup',
  'state_normal',
  'state_receiving',
  'offensiveTeam',
  'offensiveGoalDirection',
  'stallCount',
  'disc_x',
  'disc_y',
  'disc_z',
  'team_0_player_0_x', 'team_0_player_0_y', 'team_0_player_0_vx',
  'team_0_player_0_vy',
  'team_0_player_1_x', 'team_0_player_1_y', 'team_0_player_1_vx',
  'team_0_player_1_vy',
  'team_0_player_2_x', 'team_0_player_2_y', 'team_0_player_2_vx',
  'team_0_player_2_vy',
  'team_0_player_3_x', 'team_0_player_3_y', 'team_0_player_3_vx',
  'team_0_player_3_vy',
  'team_0_player_4_x', 'team_0_player_4_y', 'team_0_player_4_vx',
  'team_0_player_4_vy',
  'team_0_player_5_x', 'team_0_player_5_y', 'team_0_player_5_vx',
  'team_0_player_5_vy',
  'team_0_player_6_x', 'team_0_player_6_y', 'team_0_player_6_vx',
  'team_0_player_6_vy',
  'team_1_player_0_x', 'team_1_player_0_y', 'team_1_player_0_vx',
  'team_0_player_0_vy',
  'team_1_player_1_x', 'team_1_player_1_y', 'team_1_player_1_vx',
  'team_0_player_1_vy',
  'team_1_player_2_x', 'team_1_player_2_y', 'team_1_player_2_vx',
  'team_0_player_2_vy',
  'team_1_player_3_x', 'team_1_player_3_y', 'team_1_player_3_vx',
  'team_0_player_3_vy',
  'team_1_player_4_x', 'team_1_player_4_y', 'team_1_player_4_vx',
  'team_0_player_4_vy',
  'team_1_player_5_x', 'team_1_player_5_y', 'team_1_player_5_vx',
  'team_0_player_5_vy',
  'team_1_player_6_x', 'team_1_player_6_y', 'team_1_player_6_vx',
  'team_0_player_6_vy'
];

const ACTION_MODEL_OUTPUTS = [
  'action_rest',
  'action_move',
  'action_throw'
];

function inputTensor(inputData) {}

function actionModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 80,
    activation: 'relu',
    inputShape: [ACTION_INPUTS.length]
  }));
  model.add(tf.layers.dense({
    units: 50,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: ACTION_OUTPUTS.length,
    activation: 'softmax'
  }));
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'sparseCategoricalCrossentropy',
  });
}

async function main() {
  const model = actionModel();
  const data = await readFromFile(flags.get('input'), (value, context) => {
    if (context.lines === 1) {
      // Parse header row without modification
      return value;
    }
    if (context.column === 'state' || context.column === 'offensiveTeam'
      || context.column === 'offensiveGoalDirection'
      || context.column === 'action') {
      return parseInt(value);
    } else {
      return value === '' ? '' : parseFloat(value);
    }
  });
}

main();
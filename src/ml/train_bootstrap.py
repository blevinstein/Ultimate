import argparse
import tensorflow as tf
from tensorflow import keras

parser = argparse.ArgumentParser(description='Train a bootstrap model.')
parser.add_argument('--input', required=True, help='File to read examples from.')
parser.add_argument('--output', required=True, help='File to write model to.')
parser.add_argument('--from_checkpoint', help='Model to load as a starting point.')
parser.add_argument('--shuffle_size', default=50000, type=int, help='Shuffle batch size');
parser.add_argument('--train_batches', default=100, type=int, help='Number of training batches');
parser.add_argument('--train_batch_size', default=10000, type=int, help='Training batch size');
parser.add_argument('--epochs', default=10, type=int, help='Number of epochs to train');
flags = parser.parse_args()

ACTION_VALUES = ['rest', 'move', 'throw']
ACTION_WEIGHT = 100

MODEL_INPUTS = [
    'state',
    'offensiveTeam',
    'offensiveGoalDirection',
    'stallCount',
    'disc_x',
    'disc_y',
    'disc_z',
    'team_0_player_0_x', 'team_0_player_0_y', 'team_0_player_0_vx', 'team_0_player_0_vy', 'team_0_player_0_hasDisc',
    'team_0_player_1_x', 'team_0_player_1_y', 'team_0_player_1_vx', 'team_0_player_1_vy', 'team_0_player_1_hasDisc',
    'team_0_player_2_x', 'team_0_player_2_y', 'team_0_player_2_vx', 'team_0_player_2_vy', 'team_0_player_2_hasDisc',
    'team_0_player_3_x', 'team_0_player_3_y', 'team_0_player_3_vx', 'team_0_player_3_vy', 'team_0_player_3_hasDisc',
    'team_0_player_4_x', 'team_0_player_4_y', 'team_0_player_4_vx', 'team_0_player_4_vy', 'team_0_player_4_hasDisc',
    'team_0_player_5_x', 'team_0_player_5_y', 'team_0_player_5_vx', 'team_0_player_5_vy', 'team_0_player_5_hasDisc',
    'team_0_player_6_x', 'team_0_player_6_y', 'team_0_player_6_vx', 'team_0_player_6_vy', 'team_0_player_6_hasDisc',
    'team_1_player_0_x', 'team_1_player_0_y', 'team_1_player_0_vx', 'team_1_player_0_vy', 'team_1_player_0_hasDisc',
    'team_1_player_1_x', 'team_1_player_1_y', 'team_1_player_1_vx', 'team_1_player_1_vy', 'team_1_player_1_hasDisc',
    'team_1_player_2_x', 'team_1_player_2_y', 'team_1_player_2_vx', 'team_1_player_2_vy', 'team_1_player_2_hasDisc',
    'team_1_player_3_x', 'team_1_player_3_y', 'team_1_player_3_vx', 'team_1_player_3_vy', 'team_1_player_3_hasDisc',
    'team_1_player_4_x', 'team_1_player_4_y', 'team_1_player_4_vx', 'team_1_player_4_vy', 'team_1_player_4_hasDisc',
    'team_1_player_5_x', 'team_1_player_5_y', 'team_1_player_5_vx', 'team_1_player_5_vy', 'team_1_player_5_hasDisc',
    'team_1_player_6_x', 'team_1_player_6_y', 'team_1_player_6_vx', 'team_1_player_6_vy', 'team_1_player_6_hasDisc',
    'last_action',
    'last_move_x',
    'last_move_y',
    'last_throw_x',
    'last_throw_y',
    'last_throw_z',
    'last_throw_angleOfAttack',
    'last_throw_tiltAngle',
]
ONE_HOT_MODEL_INPUTS = {
    'state': ['pickup', 'normal', 'receiving', 'kickoff'],
    'last_action': ACTION_VALUES,
}
BINARY_MODEL_INPUTS = [
    'offensiveTeam', 'offensiveGoalDirection',
    'team_0_player_0_hasDisc',
    'team_0_player_1_hasDisc',
    'team_0_player_2_hasDisc',
    'team_0_player_3_hasDisc',
    'team_0_player_4_hasDisc',
    'team_0_player_5_hasDisc',
    'team_0_player_6_hasDisc',
    'team_1_player_0_hasDisc',
    'team_1_player_1_hasDisc',
    'team_1_player_2_hasDisc',
    'team_1_player_3_hasDisc',
    'team_1_player_4_hasDisc',
    'team_1_player_5_hasDisc',
    'team_1_player_6_hasDisc',
]

NUMERIC_MODEL_OUTPUTS = [
    'move_x', 'move_y', 'throw_x', 'throw_y', 'throw_z',
    'throw_angleOfAttack', 'throw_tiltAngle',
]
MODEL_OUTPUTS = ['action'] + NUMERIC_MODEL_OUTPUTS

SELECTED_COLUMNS = MODEL_INPUTS + MODEL_OUTPUTS

DEFAULTS_MAP = {
    'state': tf.int32,
    'offensiveTeam': tf.int32,
    'offensiveGoalDirection': tf.int32,
    'stallCount': tf.float32,
    'disc_x': tf.float32,
    'disc_y': tf.float32,
    'disc_z': tf.float32,
    'team_0_player_0_x': tf.float32,
    'team_0_player_0_y': tf.float32,
    'team_0_player_0_vx': tf.float32,
    'team_0_player_0_vy': tf.float32,
    'team_0_player_0_hasDisc': tf.int32,
    'team_0_player_1_x': tf.float32,
    'team_0_player_1_y': tf.float32,
    'team_0_player_1_vx': tf.float32,
    'team_0_player_1_vy': tf.float32,
    'team_0_player_1_hasDisc': tf.int32,
    'team_0_player_2_x': tf.float32,
    'team_0_player_2_y': tf.float32,
    'team_0_player_2_vx': tf.float32,
    'team_0_player_2_vy': tf.float32,
    'team_0_player_2_hasDisc': tf.int32,
    'team_0_player_3_x': tf.float32,
    'team_0_player_3_y': tf.float32,
    'team_0_player_3_vx': tf.float32,
    'team_0_player_3_vy': tf.float32,
    'team_0_player_3_hasDisc': tf.int32,
    'team_0_player_4_x': tf.float32,
    'team_0_player_4_y': tf.float32,
    'team_0_player_4_vx': tf.float32,
    'team_0_player_4_vy': tf.float32,
    'team_0_player_4_hasDisc': tf.int32,
    'team_0_player_5_x': tf.float32,
    'team_0_player_5_y': tf.float32,
    'team_0_player_5_vx': tf.float32,
    'team_0_player_5_vy': tf.float32,
    'team_0_player_5_hasDisc': tf.int32,
    'team_0_player_6_x': tf.float32,
    'team_0_player_6_y': tf.float32,
    'team_0_player_6_vx': tf.float32,
    'team_0_player_6_vy': tf.float32,
    'team_0_player_6_hasDisc': tf.int32,
    'team_1_player_0_x': tf.float32,
    'team_1_player_0_y': tf.float32,
    'team_1_player_0_vx': tf.float32,
    'team_1_player_0_vy': tf.float32,
    'team_1_player_0_hasDisc': tf.int32,
    'team_1_player_1_x': tf.float32,
    'team_1_player_1_y': tf.float32,
    'team_1_player_1_vx': tf.float32,
    'team_1_player_1_vy': tf.float32,
    'team_1_player_1_hasDisc': tf.int32,
    'team_1_player_2_x': tf.float32,
    'team_1_player_2_y': tf.float32,
    'team_1_player_2_vx': tf.float32,
    'team_1_player_2_vy': tf.float32,
    'team_1_player_2_hasDisc': tf.int32,
    'team_1_player_3_x': tf.float32,
    'team_1_player_3_y': tf.float32,
    'team_1_player_3_vx': tf.float32,
    'team_1_player_3_vy': tf.float32,
    'team_1_player_3_hasDisc': tf.int32,
    'team_1_player_4_x': tf.float32,
    'team_1_player_4_y': tf.float32,
    'team_1_player_4_vx': tf.float32,
    'team_1_player_4_vy': tf.float32,
    'team_1_player_4_hasDisc': tf.int32,
    'team_1_player_5_x': tf.float32,
    'team_1_player_5_y': tf.float32,
    'team_1_player_5_vx': tf.float32,
    'team_1_player_5_vy': tf.float32,
    'team_1_player_5_hasDisc': tf.int32,
    'team_1_player_6_x': tf.float32,
    'team_1_player_6_y': tf.float32,
    'team_1_player_6_vx': tf.float32,
    'team_1_player_6_vy': tf.float32,
    'team_1_player_6_hasDisc': tf.int32,
    'action': tf.int32,
    'move_x': 0.0,
    'move_y': 0.0,
    'throw_x': 0.0,
    'throw_y': 0.0,
    'throw_z': 0.0,
    'throw_angleOfAttack': 0.0,
    'throw_tiltAngle': 0.0,
    'last_action': tf.int32,
    'last_move_x': 0.0,
    'last_move_y': 0.0,
    'last_throw_x': 0.0,
    'last_throw_y': 0.0,
    'last_throw_z': 0.0,
    'last_throw_angleOfAttack': 0.0,
    'last_throw_tiltAngle': 0.0,
}
COLUMN_DEFAULTS = list(map(lambda c: DEFAULTS_MAP[c], SELECTED_COLUMNS))

def prediction_loss(y, y_pred):
  y_pred = tf.reshape(y_pred, tf.shape(y))
  action, others = tf.split(y, [len(ACTION_VALUES), len(NUMERIC_MODEL_OUTPUTS)], axis=-1)
  action_pred, others_pred = \
      tf.split(y_pred, [len(ACTION_VALUES), len(NUMERIC_MODEL_OUTPUTS)], axis=-1)

  # Cross entropy loss for categorizing action
  action_loss = tf.nn.softmax_cross_entropy_with_logits(action, action_pred)

  # MSE loss for numeric parameters (movement, throwing)
  others_loss = tf.compat.v1.losses.mean_squared_error(others, others_pred)

  return action_loss * ACTION_WEIGHT + others_loss

def reload_model(model):
  model.compile(
      loss = prediction_loss,
      optimizer = 'adam',
      metrics = ['accuracy'],)
  return model

class FullyConnectedModel(tf.keras.Model):
  def __init__(self):
    super(FullyConnectedModel, self).__init__()
    self.hidden1 = tf.keras.layers.Dense(80, activation='relu')
    self.hidden2 = tf.keras.layers.Dense(60, activation='relu')
    self.outputAction = tf.keras.layers.Dense(len(ACTION_VALUES), activation='softmax')
    self.outputNumeric = tf.keras.layers.Dense(len(NUMERIC_MODEL_OUTPUTS))
    self.outputLayer = tf.keras.layers.Concatenate(axis=1)

  def call(self, inputs):
    x = self.hidden1(inputs)
    x = self.hidden2(x)
    return self.outputLayer([
        self.outputAction(x), self.outputNumeric(x)])

PLAYER_LOGITS = 5
class ConvolutionModel(tf.keras.Model):
  def __init__(self):
    super(ConvolutionModel, self).__init__()
    self.nonConvolutionMerge = tf.keras.layers.Concatenate(axis=1)
    self.nonConvolutionHidden = tf.keras.layers.Dense(20, activation='relu')
    self.reshapeTeamConvolution = tf.keras.layers.Reshape((PLAYER_LOGITS * 6, 1))
    self.reshapeEnemyConvolution = tf.keras.layers.Reshape((PLAYER_LOGITS * 7, 1))
    self.teamConvolution = tf.keras.layers.Conv1D(
        4, (PLAYER_LOGITS,), strides = (PLAYER_LOGITS,), activation='relu')
    self.enemyConvolution = tf.keras.layers.Conv1D(
        4, (PLAYER_LOGITS,), strides = (PLAYER_LOGITS,), activation='relu')
    self.flattenTeamConvolution = tf.keras.layers.Flatten()
    self.flattenEnemyConvolution = tf.keras.layers.Flatten()
    self.mergeConvolution = tf.keras.layers.Concatenate(axis=1)
    self.hidden1 = tf.keras.layers.Dense(30, activation='relu')
    self.hidden2 = tf.keras.layers.Dense(20, activation='relu')
    self.outputAction = tf.keras.layers.Dense(len(ACTION_VALUES), activation='softmax')
    self.outputNumeric = tf.keras.layers.Dense(len(NUMERIC_MODEL_OUTPUTS))
    self.outputLayer = tf.keras.layers.Concatenate(axis=1)

  def call(self, inputs, training=False):
    gameState, myState, teamState, enemyState, lastAction = tf.split(
        inputs, [10, PLAYER_LOGITS, 6 * PLAYER_LOGITS, 7 * PLAYER_LOGITS, 10], axis=1)
    a = self.nonConvolutionHidden(
        self.nonConvolutionMerge([gameState, myState, lastAction]))
    b = self.flattenTeamConvolution(
        self.teamConvolution(self.reshapeTeamConvolution(teamState)))
    c = self.flattenEnemyConvolution(
        self.enemyConvolution(self.reshapeEnemyConvolution(enemyState)))
    d = self.hidden1(self.mergeConvolution([a, b, c]))
    e = self.hidden2(d)
    return self.outputLayer([
        self.outputAction(e), self.outputNumeric(e)])

def build_model():
  model = ConvolutionModel()

  model.compile(
      loss = prediction_loss,
      optimizer = 'adam',
      metrics = ['accuracy'],)
  return model

# Merges input features into a single tensor
# TODO: normalize inputs
RAW_INPUTS = sum(len(values) for c, values in ONE_HOT_MODEL_INPUTS.items()) + \
        len(MODEL_INPUTS) - len(ONE_HOT_MODEL_INPUTS)
RAW_OUTPUTS = len(ACTION_VALUES) + len(NUMERIC_MODEL_OUTPUTS)

def raw_inputs(data):
  all_inputs = []
  for column in MODEL_INPUTS:
    if column in ONE_HOT_MODEL_INPUTS:
      values = ONE_HOT_MODEL_INPUTS[column]
      all_inputs.append(
          tf.reshape(
              tf.dtypes.cast(
                  tf.one_hot(data[column], len(values)),
                  tf.float32),
              (len(values),)))
    else:
      if column in BINARY_MODEL_INPUTS:
        all_inputs.append(tf.cast(data[column], tf.float32))
      else:
        all_inputs.append(data[column])
  return tf.concat(all_inputs, axis = -1)

def encode_action(value):
  return ['rest', 'move', 'throw'].index(value)

def labels(data):
  #print('*******************')
  #for col in data.keys():
  #  print('%s => %s' % (col, data[col].dtype))
  #print('*******************')
  one_hot_action = tf.one_hot(data['action'], 3)
  numeric_labels = []
  for k in NUMERIC_MODEL_OUTPUTS:
    numeric_labels.append(tf.reshape(data[k], (1, 1), name=k))
  return tf.concat([one_hot_action] + numeric_labels, axis=-1)

def input_fn():
  splitter = lambda data: (raw_inputs(data), labels(data))
  return tf.data.experimental.make_csv_dataset(
        flags.input,
        batch_size=1,
        select_columns = SELECTED_COLUMNS,
        column_defaults = COLUMN_DEFAULTS
      ).map(splitter).shuffle(flags.shuffle_size)

def labels_to_output(logits):
  action_logits, other_logits = \
      tf.split(logits, [len(ACTION_VALUES), len(NUMERIC_MODEL_OUTPUTS)], axis=-1)
  actions = tf.math.argmax(action_logits, axis=-1)
  return (actions, other_logits)

def main():
  # Train using Estimator
  #estimator = tf.keras.estimator.model_to_estimator(model)
  #estimator.train(input_fn, steps=1)
  #model.summary()
  #exit(0)

  # Print an example
  #for features, labels in input_fn().batch(1).take(1):
  #  print(features)
  #  print(labels)
  #  print(labels_to_output(labels))
  #exit(0)

  # Train using Model
  if flags.from_checkpoint:
    model = reload_model(tf.keras.models.load_model(flags.from_checkpoint))
  else:
    model = build_model()

  try:
    for features, labels in input_fn().batch(flags.train_batch_size).take(flags.train_batches):
      model.fit(x=features, y=labels, epochs=flags.epochs)
  except KeyboardInterrupt:
    print('\nTraining stopped.')

  model.summary()

  # Predict some examples
  #for features, labels in input_fn().batch(1).take(1):
  #  logits = model.predict(x=features)
  #  print('prediction: %s %s' % labels_to_output(logits))
  #  print('actual: %s %s' % labels_to_output(labels))

  model.save(flags.output, include_optimizer=False)

if __name__ == '__main__':
  main()

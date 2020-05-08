import argparse
import tensorflow as tf
from tensorflow import keras

parser = argparse.ArgumentParser(description='Train a bootstrap model.')
parser.add_argument('--input', required=True, help='File to read examples from.')
parser.add_argument('--output', required=True, help='File to write model to.')
flags = parser.parse_args()

MODEL_INPUTS = [
    'state',
    'offensiveTeam',
    'offensiveGoalDirection',
    'stallCount',
    'disc_x',
    'disc_y',
    'disc_z',
    'team_0_player_0_x', 'team_0_player_0_y', 'team_0_player_0_vx', 'team_0_player_0_vy',
    'team_0_player_1_x', 'team_0_player_1_y', 'team_0_player_1_vx', 'team_0_player_1_vy',
    'team_0_player_2_x', 'team_0_player_2_y', 'team_0_player_2_vx', 'team_0_player_2_vy',
    'team_0_player_3_x', 'team_0_player_3_y', 'team_0_player_3_vx', 'team_0_player_3_vy',
    'team_0_player_4_x', 'team_0_player_4_y', 'team_0_player_4_vx', 'team_0_player_4_vy',
    'team_0_player_5_x', 'team_0_player_5_y', 'team_0_player_5_vx', 'team_0_player_5_vy',
    'team_0_player_6_x', 'team_0_player_6_y', 'team_0_player_6_vx', 'team_0_player_6_vy',
    'team_1_player_0_x', 'team_1_player_0_y', 'team_1_player_0_vx', 'team_1_player_0_vy',
    'team_1_player_1_x', 'team_1_player_1_y', 'team_1_player_1_vx', 'team_1_player_1_vy',
    'team_1_player_2_x', 'team_1_player_2_y', 'team_1_player_2_vx', 'team_1_player_2_vy',
    'team_1_player_3_x', 'team_1_player_3_y', 'team_1_player_3_vx', 'team_1_player_3_vy',
    'team_1_player_4_x', 'team_1_player_4_y', 'team_1_player_4_vx', 'team_1_player_4_vy',
    'team_1_player_5_x', 'team_1_player_5_y', 'team_1_player_5_vx', 'team_1_player_5_vy',
    'team_1_player_6_x', 'team_1_player_6_y', 'team_1_player_6_vx', 'team_1_player_6_vy',
    'last_action',
    'last_move_x',
    'last_move_y',
    'last_throw_x',
    'last_throw_y',
    'last_throw_z',
    'last_throw_angleOfAttack',
    'last_throw_tiltAngle',
]

ACTION_OUTPUT = 'action'
ACTION_VALUES = ['rest', 'move', 'throw']
NUMERIC_MODEL_OUTPUTS = [
    'move_x', 'move_y', 'throw_x', 'throw_y', 'throw_z',
    'throw_angleOfAttack', 'throw_tiltAngle']

MODEL_OUTPUTS = [ACTION_OUTPUT] + NUMERIC_MODEL_OUTPUTS
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
    'team_0_player_1_x': tf.float32,
    'team_0_player_1_y': tf.float32,
    'team_0_player_1_vx': tf.float32,
    'team_0_player_1_vy': tf.float32,
    'team_0_player_2_x': tf.float32,
    'team_0_player_2_y': tf.float32,
    'team_0_player_2_vx': tf.float32,
    'team_0_player_2_vy': tf.float32,
    'team_0_player_3_x': tf.float32,
    'team_0_player_3_y': tf.float32,
    'team_0_player_3_vx': tf.float32,
    'team_0_player_3_vy': tf.float32,
    'team_0_player_4_x': tf.float32,
    'team_0_player_4_y': tf.float32,
    'team_0_player_4_vx': tf.float32,
    'team_0_player_4_vy': tf.float32,
    'team_0_player_5_x': tf.float32,
    'team_0_player_5_y': tf.float32,
    'team_0_player_5_vx': tf.float32,
    'team_0_player_5_vy': tf.float32,
    'team_0_player_6_x': tf.float32,
    'team_0_player_6_y': tf.float32,
    'team_0_player_6_vx': tf.float32,
    'team_0_player_6_vy': tf.float32,
    'team_1_player_0_x': tf.float32,
    'team_1_player_0_y': tf.float32,
    'team_1_player_0_vx': tf.float32,
    'team_1_player_0_vy': tf.float32,
    'team_1_player_1_x': tf.float32,
    'team_1_player_1_y': tf.float32,
    'team_1_player_1_vx': tf.float32,
    'team_1_player_1_vy': tf.float32,
    'team_1_player_2_x': tf.float32,
    'team_1_player_2_y': tf.float32,
    'team_1_player_2_vx': tf.float32,
    'team_1_player_2_vy': tf.float32,
    'team_1_player_3_x': tf.float32,
    'team_1_player_3_y': tf.float32,
    'team_1_player_3_vx': tf.float32,
    'team_1_player_3_vy': tf.float32,
    'team_1_player_4_x': tf.float32,
    'team_1_player_4_y': tf.float32,
    'team_1_player_4_vx': tf.float32,
    'team_1_player_4_vy': tf.float32,
    'team_1_player_5_x': tf.float32,
    'team_1_player_5_y': tf.float32,
    'team_1_player_5_vx': tf.float32,
    'team_1_player_5_vy': tf.float32,
    'team_1_player_6_x': tf.float32,
    'team_1_player_6_y': tf.float32,
    'team_1_player_6_vx': tf.float32,
    'team_1_player_6_vy': tf.float32,
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

  #print('Action')
  #print(action)
  #print(action_pred)

  action_loss = tf.nn.softmax_cross_entropy_with_logits(action, action_pred)

  #print(action_loss)
  #print('Others')
  #print(others)
  #print(others_pred)

  others_loss = tf.compat.v1.losses.mean_squared_error(others, others_pred)

  #print(others_loss)

  return action_loss + others_loss

def build_model(n_outputs):
  # Input layer
  state = tf.feature_column.indicator_column(
      tf.feature_column.categorical_column_with_vocabulary_list(
          'state', vocabulary_list=[0, 1, 2]))
  offensive_goal_direction = tf.feature_column.indicator_column(
      tf.feature_column.categorical_column_with_vocabulary_list(
          'offensiveGoalDirection', vocabulary_list=[0, 1]))
  offensive_team = tf.feature_column.indicator_column(
      tf.feature_column.categorical_column_with_vocabulary_list(
          'offensiveTeam', vocabulary_list=[0, 1]))
  last_action = tf.feature_column.indicator_column(
      tf.feature_column.categorical_column_with_vocabulary_list(
          'last_action', vocabulary_list=['rest', 'move', 'throw']))
  feature_layer_inputs = {
      'state':
          tf.keras.Input(shape = (1,), name = 'state', dtype = 'int32'),
      'offensiveGoalDirection':
          tf.keras.Input(shape = (1,), name = 'offensiveGoalDirection', dtype = 'int32'),
      'offensiveTeam': tf.keras.Input(shape = (1,), name = 'offensiveTeam', dtype = 'int32'),
      'last_action': tf.keras.Input(shape = (1,), name = 'last_action', dtype = 'int32'),
  }
  feature_columns = [state, offensive_team, offensive_goal_direction]
  for column_name in [
      'stallCount', 'disc_x', 'disc_y', 'disc_z',
      'team_0_player_0_x', 'team_0_player_0_y', 'team_0_player_0_vx', 'team_0_player_0_vy',
      'team_0_player_1_x', 'team_0_player_1_y', 'team_0_player_1_vx', 'team_0_player_1_vy',
      'team_0_player_2_x', 'team_0_player_2_y', 'team_0_player_2_vx', 'team_0_player_2_vy',
      'team_0_player_3_x', 'team_0_player_3_y', 'team_0_player_3_vx', 'team_0_player_3_vy',
      'team_0_player_4_x', 'team_0_player_4_y', 'team_0_player_4_vx', 'team_0_player_4_vy',
      'team_0_player_5_x', 'team_0_player_5_y', 'team_0_player_5_vx', 'team_0_player_5_vy',
      'team_0_player_6_x', 'team_0_player_6_y', 'team_0_player_6_vx', 'team_0_player_6_vy',
      'team_1_player_0_x', 'team_1_player_0_y', 'team_1_player_0_vx', 'team_1_player_0_vy',
      'team_1_player_1_x', 'team_1_player_1_y', 'team_1_player_1_vx', 'team_1_player_1_vy',
      'team_1_player_2_x', 'team_1_player_2_y', 'team_1_player_2_vx', 'team_1_player_2_vy',
      'team_1_player_3_x', 'team_1_player_3_y', 'team_1_player_3_vx', 'team_1_player_3_vy',
      'team_1_player_4_x', 'team_1_player_4_y', 'team_1_player_4_vx', 'team_1_player_4_vy',
      'team_1_player_5_x', 'team_1_player_5_y', 'team_1_player_5_vx', 'team_1_player_5_vy',
      'team_1_player_6_x', 'team_1_player_6_y', 'team_1_player_6_vx', 'team_1_player_6_vy',
      'last_move_x', 'last_move_y',
      'last_throw_x', 'last_throw_y', 'last_throw_z',
      'last_throw_angleOfAttack', 'last_throw_tiltAngle']:
    feature_layer_inputs[column_name] = tf.keras.Input(shape = (1,), name = column_name)
    feature_columns.append(tf.feature_column.numeric_column(column_name))

  feature_layer_output = \
      tf.keras.layers.DenseFeatures(feature_columns)(feature_layer_inputs)
  hidden = tf.keras.layers.Dense(80, activation='relu')(feature_layer_output)
  hidden = tf.keras.layers.Dense(60, activation='relu')(hidden)
  output = tf.keras.layers.Dense(n_outputs)(hidden)
  model = tf.keras.Model(inputs=feature_layer_inputs, outputs=output)

  model.compile(
      loss = prediction_loss,
      optimizer = 'adam',
      metrics = ['accuracy'],)
  return model

# GRAVEYARD

  #action_head = tf.estimator.MultiClassHead(
  #    name = 'action',
  #    n_classes = 3,
  #    label_vocabulary = ['rest', 'move', 'throw']);
  #move_head = tf.estimator.RegressionHead(name = 'move', label_dimension = 2)
  #throw_head = tf.estimator.RegressionHead(name = 'throw', label_dimension = 5)
  #multi_head = tf.estimator.MultiHead([action_head, move_head])

  #hidden_layer_1 = tf.keras.layers.Dense(80, activation='relu')(feature_layer)
  #hidden_layer_2 = tf.keras.layers.Dense(60, activation='relu')(hidden_layer_1)

  #action_logits = tf.keras.layers.Dense(3, activation='softmax')(hidden_layer_2)
  #move_logits = tf.keras.layers.Dense(2)(hidden_layer_2)
  #throw_logits = tf.keras.layers.Dense(5)(hidden_layer_2)

  #return multi_head.create_estimator_spec(
  #    mode = 'train',
  #    features = MODEL_INPUTS,
  #    labels = {'action': 'action', 'move': ['move_x', 'move_y']}, # no idea wtf this is
  #    logits = {'action': action_logits, 'move': move_logits})

  #def model_fn(features, labels, mode):
  #  action_head = tf.estimator.MultiClassHead(n_classes=3)
  #  return action_head.create_estimator_spec(
  #      features=features,
  #      mode=mode,
  #      labels=labels,
  #      optimizer=tf.keras.optimizers.Adam(0.01),
  #      logits=build_model()(features))

# /GRAVEYARD

#def custom_loss(actual, predicted):

def input_features(data):
  return {k: data[k] for k in MODEL_INPUTS}

def encode_action(value):
  return ['rest', 'move', 'throw'].index(value)

def labels(data):
  #print('*******************')
  #for col in data.keys():
  #  print('%s => %s' % (col, data[col].dtype))
  #print('*******************')
  one_hot_action = tf.one_hot(data[ACTION_OUTPUT], 3)
  numeric_labels = []
  for k in NUMERIC_MODEL_OUTPUTS:
    numeric_labels.append(tf.reshape(data[k], (1, 1), name=k))
  return tf.concat([one_hot_action] + numeric_labels, axis=1)

def split_data(data):
  return (input_features(data), labels(data))

def input_fn():
  return tf.data.experimental.make_csv_dataset(
        flags.input,
        batch_size=1,
        select_columns = SELECTED_COLUMNS,
        column_defaults = COLUMN_DEFAULTS).map(split_data).shuffle(100000)

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

  # Print a example
  #for features, labels in input_fn().batch(1).take(1):
  #  print(features)
  #  print(labels)
  #  print(labels_to_output(labels))
  #exit(0)

  # Train using Model
  model = build_model(len(ACTION_VALUES) + len(NUMERIC_MODEL_OUTPUTS))
  for features, labels in input_fn().batch(50000).take(1):
    model.fit(x=features, y=labels, epochs=10)
  model.summary()

  # Predict some examples
  for features, labels in input_fn().take(1):
    logits = model.predict(x=features)
    print('prediction: %s %s' % labels_to_output(logits))
    print('actual: %s %s' % labels_to_output(labels))

  tf.keras.models.save_model(model, flags.output)

if __name__ == '__main__':
  main()

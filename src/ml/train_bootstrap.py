import argparse
import tensorflow as tf
from tensorflow import keras

parser = argparse.ArgumentParser(description='Train a bootstrap model.')
parser.add_argument('input', help='File to read examples from.')
parser.add_argument('output', help='File to write model to.')
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
]

MODEL_OUTPUTS = ['action'];
    #, 'move_x', 'move_y'];
    #'throw_x', 'throw_y', 'throw_z',
    #'throw_angleOfAttack', 'throw_tiltAngle'];


def build_model():
  # Input layer
  state = tf.feature_column.indicator_column(
      tf.feature_column.categorical_column_with_vocabulary_list(
          'state', vocabulary_list=['receiving', 'pickup', 'normal']))
  offensive_goal_direction = tf.feature_column.indicator_column(
      tf.feature_column.categorical_column_with_vocabulary_list(
          'offensiveGoalDirection', vocabulary_list=['E', 'W']))
  offensive_team = tf.feature_column.indicator_column(
      tf.feature_column.categorical_column_with_vocabulary_list(
          'offensiveTeam', vocabulary_list=[0, 1]))
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
      'team_1_player_6_x', 'team_1_player_6_y', 'team_1_player_6_vx', 'team_1_player_6_vy']:
    feature_columns.append(tf.feature_column.numeric_column(column_name))

  model = tf.keras.Sequential([
      tf.keras.layers.DenseFeatures(feature_columns),
      tf.keras.layers.Dense(80, activation='relu'),
      tf.keras.layers.Dense(60, activation='relu'),
      tf.keras.layers.Dense(3, activation='softmax')])

  model.compile(
      loss = tf.keras.losses.SparseCategoricalCrossentropy(),
      optimizer = tf.keras.optimizers.Adam(0.01),
      metrics = ['accuracy'])
  return model

  # GRAVEYARD

  #feature_layer_inputs = {
  #    'state':
  #        tf.keras.Input(shape = (1,), name = 'state', dtype = 'string'),
  #    'offensiveGoalDirection':
  #        tf.keras.Input(shape = (1,), name = 'offensiveGoalDirection', dtype = 'string'),
  #    'offensiveTeam': tf.keras.Input(shape = (1,), name = 'offensiveTeam', dtype = 'int32'),
  #}
    #feature_layer_inputs[column_name] = tf.keras.Input(shape = (1,), name = column_name)

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

  #return tf.keras.Model(inputs = feature_layer_inputs, outputs = action_logits)

  #return multi_head.create_estimator_spec(
  #    mode = 'train',
  #    features = MODEL_INPUTS,
  #    labels = {'action': 'action', 'move': ['move_x', 'move_y']}, # no idea wtf this is
  #    logits = {'action': action_logits, 'move': move_logits})

  # /GRAVEYARD

def split_data(data):
  features = {k: data[k] for k in MODEL_INPUTS}
  action_labels = {'action': data['action']}
  move_labels = {k: data[k] for k in ['move_x', 'move_y']}
  throw_labels = {k: data[k] for k in ['throw_x', 'throw_y', 'throw_z', 'throw_angleOfAttack',
    'throw_tiltAngle']}
  return features, {'action': action_labels, 'move': move_labels, 'throw': throw_labels}

def input_fn():
  return tf.data.experimental.make_csv_dataset(
      flags.input,
      batch_size = 1000,
      select_columns = MODEL_INPUTS + MODEL_OUTPUTS,
      na_value = '')

def features(data):
  return {k: data[k] for k in MODEL_INPUTS}

def labels(data):
  return {k: data[k] for k in MODEL_OUTPUTS}

def main():
  dataset = input_fn()
  model = build_model()

  for batch in dataset.take(1):
    print(features(batch))
    print(batch[MODEL_OUTPUTS[0]])
    model.fit(x=batch, y=batch[MODEL_OUTPUTS[0]], epochs=10)
    #model.fit(x=features(batch), y=labels(batch), epochs=10)

  model.summary()

  #tf.keras.models.save_model(model, flags.output)

if __name__ == '__main__':
  main()

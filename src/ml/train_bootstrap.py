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

MODEL_OUTPUTS = ['action']
    #'move_x', 'move_y',
    #'throw_x', 'throw_y', 'throw_z',
    #'throw_angleOfAttack', 'throw_tiltAngle'];


def build_model(n_outputs, output_activation='softmax'):
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
  feature_layer_inputs = {
      'state':
          tf.keras.Input(shape = (1,), name = 'state', dtype = 'string'),
      'offensiveGoalDirection':
          tf.keras.Input(shape = (1,), name = 'offensiveGoalDirection', dtype = 'string'),
      'offensiveTeam': tf.keras.Input(shape = (1,), name = 'offensiveTeam', dtype = 'int32'),
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
      'team_1_player_6_x', 'team_1_player_6_y', 'team_1_player_6_vx', 'team_1_player_6_vy']:
    feature_layer_inputs[column_name] = tf.keras.Input(shape = (1,), name = column_name)
    feature_columns.append(tf.feature_column.numeric_column(column_name))

  feature_layer_output = \
      tf.keras.layers.DenseFeatures(feature_columns)(feature_layer_inputs)
  hidden = tf.keras.layers.Dense(80, activation='relu')(feature_layer_output)
  hidden = tf.keras.layers.Dense(60, activation='relu')(hidden)
  output = tf.keras.layers.Dense(n_outputs, activation=output_activation)(hidden)
  model = tf.keras.Model(inputs=feature_layer_inputs, outputs=output)


  model.compile(
      loss = tf.keras.losses.SparseCategoricalCrossentropy(),
      optimizer = 'adam',
      metrics = ['accuracy'])
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

def input_features(data):
  return {k: data[k] for k in MODEL_INPUTS}

def labels(data):
  return tf.concat([data[k] for k in MODEL_OUTPUTS], axis=1)

def split_data(data):
  return (input_features(data), labels(data))

def input_fn():
  return tf.data.experimental.make_csv_dataset(
        flags.input,
        batch_size=1,
        select_columns = MODEL_INPUTS + MODEL_OUTPUTS,
        na_value = '').map(split_data)

def main():

  # Train using Estimator
  #estimator = tf.keras.estimator.model_to_estimator(model)
  #estimator.train(input_fn, steps=1)
  #model.summary()
  #exit(0)

  # Train using Model
  action_model = build_model(3)
  for features, labels in input_fn().batch(1000).take(1):
    action_model.fit(x=features, y=labels, epochs=10)
  action_model.summary()
  for features, labels in input_fn().batch(1000).take(1):
    print(features)
    print(labels)
    action_model.evaluate(x=features, y=labels)

  # Predict a single example
  #for features, labels in input_fn().take(1):
  #  logits = model.predict(x=features)
  #  predicted_label = tf.math.argmax(logits, axis=1)
  #  print('prediction: %s' % predicted_label)

  #tf.keras.models.save_model(model, flags.output)

if __name__ == '__main__':
  main()

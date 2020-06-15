import argparse

def check(file):
  columns = None
  if flags.remove:
    with open(file, 'r') as f:
      lines = f.readlines()
    with open(file, 'w') as f:
      for lineNumber, line in enumerate(lines):
        currentColumns = line.count(',') + 1
        columns = columns or currentColumns
        mismatch = columns != currentColumns
        if mismatch:
          print('[%d] Expected %d but found %d columns' % (lineNumber, columns, currentColumns))
        else:
          f.write(line)
  else:
    with open(file, 'r') as f:
      lines = f.readlines()
      for lineNumber, line in enumerate(lines):
        currentColumns = line.count(',') + 1
        columns = columns or currentColumns
        mismatch = columns != currentColumns
        if mismatch:
          print('[%d] Expected %d but found %d columns' % (lineNumber, columns, currentColumns))

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='Train a bootstrap model.')
  parser.add_argument('--file', required=True, help='File to check');
  parser.add_argument('--remove', default=False, help='Delete broken rows');
  flags = parser.parse_args()
  check(flags.file)

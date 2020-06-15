const fs = require('fs');
const fsPromises = require('fs.promises');
const parse = require('csv-parse');
const stringify = require('csv-stringify');

const PRECISION = 3;

module.exports.writeToFile = (filename, headers, data) => {
  const stringifier = stringify({
    delimiter: ',',
    cast: {
      number: (num) => Number.isInteger(num) ? num.toString() : num
        .toFixed(PRECISION)
    },
  });
  const appendMode = fs.existsSync(filename);
  if (appendMode) {
    console.log('Appending to existing output file...');
  }
  const lines = [];
  stringifier.on('readable', () => {
    let row;
    while (row = stringifier.read()) {
      lines.push(row);
    }
  });
  stringifier.on('error', (e) => {
    console.error(e.message);
  });
  stringifier.on('finish', () => {
    fs.appendFileSync(filename, lines.join(''));
  });
  if (!appendMode) {
    stringifier.write(headers);
  }
  for (let i = 0; i < data.length; i++) {
    stringifier.write(data[i]);
  }
  stringifier.end();
};

module.exports.readFromFile = (filename, cast = undefined) => {
  const promise = new Promise((resolve, reject) => {
    const parser = parse({
      columns: true,
      cast
    });
    const output = [];
    parser.on('readable', () => {
      let record;
      while (record = parser.read()) {
        output.push(record);
      }
    });
    parser.on('error', (e) => {
      reject(e.message);
    });
    parser.on('end', () => resolve(output));
    parser.write(fs.readFileSync(filename));
    parser.end();
  });
  return promise;
};
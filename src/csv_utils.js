const fs = require('fs');
const parse = require('csv-parse');
const stringify = require('csv-stringify');

module.exports.writeToFile = (filename, data) => {
  const lines = [];
  const stringifier = stringify({
    delimiter: ','
  });
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
    fs.writeFile(filename, lines.join(''), (e) => {
      if (e) throw err;
    });
  });
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
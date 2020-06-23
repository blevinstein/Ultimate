const express = require('express')
const expressBrowserify = require('express-browserify');
const flags = require('flags')
const path = require('path');

flags.defineInteger('port', 8000, 'Port for serving over http');
flags.parse();

const app = express()
const port = flags.get('port');
const browserifyOptions = {
  watch: true,
  precompile: true,
};

app.use(express.static('static/'));
app.use(express.static('js_model/'));

for (let root of ['index.js', 'play.js', 'practice_main.js']) {
  app.get(
    path.join('/', root),
    expressBrowserify([path.join('src', root)],
      browserifyOptions));
}

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
const express = require('express')
const expressBrowserify = require('express-browserify');
const flags = require('flags')
const path = require('path');

flags.defineInteger('port', 8000, 'Port for serving over http');
flags.defineBoolean('live', true,
  'True for live reloading, false for compiled build');
flags.parse();

const app = express()
const port = flags.get('port');

app.use(express.static('static/'));
app.use(express.static('js_model/'));

if (flags.get('live')) {
  for (let root of ['index.js', 'play.js', 'practice_main.js']) {
    app.get(
      path.join('/', root),
      expressBrowserify([path.join('src', root)], {
        watch: true,
        precompile: true
      }));
  }
} else {
  console.log('Using static build');
  app.use(express.static('build/'));
}

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
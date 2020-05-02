const express = require('express')
const flags = require('flags')
const expressBrowserify = require('express-browserify');

flags.defineInteger('port', 8000, 'Port for serving over http');
flags.parse();

const app = express()
const port = flags.get('port');
const browserifyOptions = {
  watch : true
};

app.use(express.static('static/'));
// app.use(express.static('build/'));
app.get('/index.js', expressBrowserify([ 'src/index.js' ], browserifyOptions));
app.get('/play.js', expressBrowserify([ 'src/play.js' ], browserifyOptions));
app.get('/practice_main.js',
        expressBrowserify([ 'src/practice_main.js' ], browserifyOptions));
app.get('/dummy.js', expressBrowserify([ 'src/dummy.js' ], browserifyOptions));

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));

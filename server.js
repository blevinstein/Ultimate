const express = require('express')
const flags = require('flags')

flags.defineInteger('port', 8000, 'Port for serving over http');
flags.parse();

const app = express()
const port = flags.get('port');

app.use(express.static('.'));
app.listen(port, () => console.log(`Listening at http://localhost:${port}`));

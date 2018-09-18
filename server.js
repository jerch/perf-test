const express = require('express');
const app = express();
const path = require('path');

// devtools strip down is hosted here
app.use(express.static('static'));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/index.html', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/html.js', function (req, res) {
  res.sendFile(path.join(__dirname + '/html.js'));
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

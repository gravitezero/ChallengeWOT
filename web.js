var express = require('express'),
	publicDir = '/src';

var app = express.createServer(express.logger());

app.use(express.static(__dirname + publicDir));

var port = process.env.PORT || 8080;

app.listen(port, function() {
  console.log("Listening on " + port);
});
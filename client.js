var express = require('express'),
	publicDir = '/client';

var app = express(express.logger());

app.use(express.static(__dirname + publicDir));

var port = process.env.PORT || 8081;

app.listen(port, function() {
  console.log("Listening on " + port);
});
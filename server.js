var express = require('express');
var mongoose = require('mongoose');
var app = express();

app.listen(process.env.port || 3000, function() {
  console.log('up and running');
});

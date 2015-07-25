var express  = require('express');
var mongoose = require('mongoose');
var app      = express();

mongoose.connect(process.env.MONGOURI || 'mongodb://localhost/files_db');

var apiRouter = express.Router();
require('./routes/users-routes')(apiRouter);
require('./routes/files-routes')(apiRouter);

app.use('/api', apiRouter);

app.listen(process.env.port || 3000, function() {
  console.log('up and running');
});

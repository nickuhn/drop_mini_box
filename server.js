var express = require('express');
var app = express();

var apiRouter = express.Router();
require('./routes/users-routes')(apiRouter);
require('./routes/files-routes')(apiRouter);

app.use('/api', apiRouter);

app.listen(process.env.port || 3000, function() {
  console.log('up and running');
});

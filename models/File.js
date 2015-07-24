var mongoose = require('mongoose');
var Schema = mongoose.Schema;

fileSchema = Schema({
  name: String,
  url: String,
  user: {type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('File', fileSchema);

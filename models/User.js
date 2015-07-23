var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = Schema({
  name: String,
  files: [{type: Schema.Types.ObjectId, ref: 'File'}]
});

module.exports = mongoose.model('User', userSchema);

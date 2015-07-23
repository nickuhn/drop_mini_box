var bodyParser = require('body-parser');
var fs = require('fs');
var File = require(__dirname + '/../models/File');
var User = require(__dirname + '/../models/User');
module.exports = function(router) {
  router.use(bodyParser.json());

  router.route('/users/:user/files')
    .get(function(req, res) {
      User.findOne({name: req.params.user})
            .populate('files')
            .exec(function(err, user) {
              if (err) {
                res.send(err);
              }
              res.json(user.files);
            });
    })

    .post(function(req, res) {
      fs.writeFile(__dirname + '/../files/' + req.params.user +'/' + req.body.name, function(err) {
        if (err) {
          res.send(err);
        } else {
          var file = new File(req.body);
          User.findOne({name: req.params.user}, function(err, found) {
            if (err) {
              res.send(err);
            }
            found.files.push(file._id);
            file.user = found._id;
            found.save(function(err, file) {
              if (err) {
                res.send(err);
              }
            });
            file.save(function(err, file) {
              if (err) {
                res.send(err);
              }
              res.json(file);
            });
          });
        }
      });
    });

  router.route('/users/:user/files/:file')
    .get(function(req, res) {
      File.findOne({name: req.params.file})
            .populate('user')
            .exec(function(err, file) {
              if (err) {
                res.send(err);
              }
              res.send(file);
            });
    })

    .put(function(req, res) {
      fs.rename(__dirname + '/../files/' + req.params.user + '/' + req.params.file, __dirname + '/../files/' + req.params.user + '/' + req.body.name, function(err) {
        if (err) {
          res.send(err);
        } else {
          File.update({name: req.params.file}, req.body, function(err, file) {
            if (err) {
              res.send(err);
            }
            res.send({msg: 'Renamed and updated file: ' + req.params.file + ' to: ' + req.body.name});
          });
        }
      });
    })

    .delete(function(req, res) {
      File.remove({name: req.params.file}, function(err){
        if (err) {
          res.send(err);
        } else {
          fs.unlink(__dirname + '/../files/' + req.params.user +'/' + req.params.file, function(err){
            if (err) {
              res.send(err);
            }
          });
        }
      });
    });

};

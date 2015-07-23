var bodyParser = require('body-parser');
var fs = require('fs');
var AWS = require('aws-sdk');
var User = require(__dirname + '/../models/User');
var s3 = new AWS.S3();
AWS.config.loadFromPath('./credentials/config.json');
var parentBucket = 'nickuhnbucket/';

module.exports = function(router) {
  router.use(bodyParser.json());


  router.route('/users')
    .get(function(req, res) {
      User.find({}, function(err, users) {
        if (err) {
          res.send(err);
        }
        res.send(users);
      });
    })

    .post(function(req, res) {
      fs.mkdir(__dirname + '/../files/' + req.body.name, function(err) {
        if (err) {
          res.send(err);
        } else {
          User.create(req.body, function(err, user) {
             if (err) {
              res.send(err);
            } else {
              s3.createBucket({Bucket: parentBucket + req.body.name}, function(err, data){
                if (err) {
                  res.send(err);
                } else {
                  res.send({msg: 'succesfully created directory for: ' + req.body.name});
                }
              });
            }
          });
        }
      });
    });

  router.route('/users/:user')
    .get(function(req, res) {
      User.findOne({name: req.params.user})
            .populate('files')
            .exec(function(err, user) {
              if (err) {
                res.send(err);
              }
              res.json(user);
            });
    })

    .put(function(req, res) {
      fs.rename(__dirname + '/../files/' + req.params.user, __dirname + '/../files/' + req.body.name, function(err) {
        if (err) {
          res.send(err);
        } else {
          User.update({name: req.params.user}, req.body, function(err, user) {
            if (err) {
              res.send(err);
            }
            res.send({msg: 'Renamed Directory: ' + req.params.user + ' to: ' + req.body.name});
          });
        }
      });
    })

    .delete(function(req, res) {
      User.remove({name: req.params.user}, function(err){
        if (err) {
          res.send(err);
        } else {
          fs.rmdir(__dirname + '/../files/' + req.params.user, function(err) {
            if (err) {
              res.send(err);
            } else {
              s3.deleteBucket({Bucket: parentBucket + req.params.user}, function(err, data) {
                if (err) {
                  res.send(err);
                } else {
                  res.send({msg: 'succesfully deleted directory for: ' + req.params.user});
                }
              });
            }
          });
        }
      });
    });

};

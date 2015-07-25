var bodyParser = require('body-parser');
var File = require(__dirname + '/../models/File');
var fs = require('fs');
var AWS = require('aws-sdk');
var User = require(__dirname + '/../models/User');
var s3 = new AWS.S3();
var parentBucket = 'nickuhnbucket';

module.exports = function(router) {
  router.use(bodyParser.json());


  router.route('/users')
    //Gets a list of all users from mongodb and returns them without files populated
    .get(function(req, res) {
      User.find({}, function(err, users) {
        if (err) {
          res.send(err);
        }
        res.send(users);
      });
    })
    //creates a new directory, bucket on s3, and user on mongodb
    .post(function(req, res) {
      fs.mkdir(__dirname + '/../files/' + req.body.name, function(err) {
        if (err) {
          res.send(err);
        } else {
          User.create(req.body, function(err, user) {
             if (err) {
              res.send(err);
            } else {
              s3.createBucket({Bucket: parentBucket + '/' + req.body.name}, function(err, data){
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
    //gets a specific user from mongodb with it's files populated
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
      params = {Bucket: parentBucket};
      params.Delete = {};
      params.Delete.Objects = [];
      s3.createBucket({Bucket: parentBucket + '/' + req.body.name}, function(err, data){
        if (err) {
          res.send(err);
        } else {
          fs.readdir(__dirname + '/../files/' + req.params.user, function(err, files) {
            if (err) {
              res.send(err)
            } else {
              for (var i = 0; i < files.length; i++) {
                params.Delete.Objects.push({Key: req.params.user + '/' + files[i]});
                s3.copyObject({Bucket: parentBucket, CopySource: parentBucket + '/' + req.params.user + '/' + files[i], Key: req.body.name + '/' + files[i]}, function(err, data) {
                  if (err) {
                    res.send(err);
                  } else {
                  }
                });
                if (i === files.length - 1) {
                  s3.deleteObjects(params, function(err, data) {
                    if (err) {
                      res.send(err)
                    }
                  });
                }
              }
              s3.deleteBucket({Bucket: parentBucket + '/' + req.params.user}, function(err, data) {
                if (err) {
                  res.send(err);
                } else {
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
                }
              })
            }
          });
        }
      })
    })

    //Deletes a user and all their files across mongodb, hard disc, and s3
    .delete(function(req, res) {
      params = {Bucket: parentBucket};
      params.Delete = {};
      params.Delete.Objects = [];
      fs.readdir(__dirname + '/../files/' + req.params.user, function(err, files) {
        if (err) {
          res.send(err);
        } else {
          for (var i = 0; i < files.length; i++) {
            fs.unlinkSync(__dirname + '/../files/' + req.params.user + '/' + files[i]);
            params.Delete.Objects.push({Key: req.params.user + '/' + files[i]});
          }
          s3.deleteObjects(params, function(err, data) {
            if (err) {
              res.send(err)
            } else {
              fs.rmdir(__dirname + '/../files/' + req.params.user, function(err) {
                if (err) {
                  res.send(err);
                } else {
                  s3.deleteBucket({Bucket: parentBucket + '/' +req.params.user}, function(err, data) {
                    if (err) {
                      res.send(err);
                    } else {
                      User.findOne({name: req.params.user}, function (err, user){
                        if (err) {
                          res.send(err);
                        } else {
                          var ownerId = user._id;
                          File.remove({user: ownerId}, function(err) {
                            if (err) {
                              res.send(err);
                            } else {
                              User.remove({name: req.params.user}, function(err){
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
                    }
                  });
                }
              });
            }
          });
        }
      });
    });

};

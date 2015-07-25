var fs           = require('fs');
var AWS          = require('aws-sdk');
var File         = require(__dirname + '/../models/File');
var User         = require(__dirname + '/../models/User');
var bodyParser   = require('body-parser');
var EventEmitter = require('events').EventEmitter;
var s3           = new AWS.S3();
var s3done       = false;
var hdDone       = false;
var mongodbDone  = false;
var parentBucket = 'nickuhnbucket';

module.exports = function(router) {
  router.use(bodyParser.json());

  function sendRes(res, message) {
    if (message === 'error') {
      res.status(500).json({msg: 'server error'});
    } else if (s3done && mongodbDone && hdDone) {
      res.json({msg: message});
    }
  }

  router.route('/users')

    //Gets a list of all users from mongodb and returns them without files populated
    .get(function(req, res) {
      User.find({}, function(err, users) {
        if (err) {
          sendRes(res, 'error');
        } else {
          res.json(users);
        }
      });
    })

    //creates a new directory, bucket on s3, and user on mongodb
    .post(function(req, res) {
      var ee      = new EventEmitter();
      var message = 'succesfully created directory for: ' + req.body.name;
      s3done      = false;
      mongodbDone = false;
      hdDone      = false;

      fs.mkdir(__dirname + '/../files/' + req.body.name, function(err) {
        if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('hdDone');
        }
      });

      User.create(req.body, function(err, user) {
         if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('mongodbDone');
        }
      });

      s3.createBucket({Bucket: parentBucket + '/' + req.body.name}, function(err, data){
        if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('s3done');
        }
      });

      ee.on('s3done', function() {
        s3done = true;
        sendRes(res, message);
      });
      ee.on('mongodbDone', function() {
        mongodbDone = true;
        sendRes(res, message);
      });
      ee.on('hdDone', function() {
        hdDone = true;
        sendRes(res, message);
      });
    });

  router.route('/users/:user')

    //gets a specific user from mongodb with it's files populated
    .get(function(req, res) {
      User.findOne({name: req.params.user})
            .populate('files')
            .exec(function(err, user) {
              if (err) {
                sendRes(res, 'error');
              } else {
                res.json(user);
              }
            });
    })

    //Renames user's name on mongodb, file name on hard disc,
    //prefix on all files and bucket on s3.
    .put(function(req, res) {
      var ee                = new EventEmitter();
      var message           = 'Renamed Directory: ' + req.params.user + ' to: ' + req.body.name;
      var params            = {Bucket: parentBucket};
      mongodbDone           = false;
      hdDone                = false;
      s3done                = false;
      params.Delete         = {};
      params.Delete.Objects = [];

      s3.createBucket({Bucket: parentBucket + '/' + req.body.name}, function(err, data){
        if (err) {
          sendRes(res, 'error');
        } else {
          s3.listObjects({Bucket: parentBucket, Prefix: req.params.user + '/'}, function(err, data) {
            if (err) {
              sendRes(res, 'error');
            } else {
              for (var i = 0; i < data.Contents.length; i++) {
                var fileName = data.Contents[i].Key.split('/')[1];
                params.Delete.Objects.push({Key: data.Contents[i].Key});
                s3.copyObject({Bucket: parentBucket, CopySource: parentBucket + '/' + data.Contents[i].Key, Key: req.body.name + '/' + fileName}, function(err, data) {
                  if (err) {
                    sendRes(res, 'error');
                  }
                });
                if (i === data.Contents.length - 1) {
                  s3.deleteObjects(params, function(err, data) {
                    if (err) {
                      sendRes(res, 'error');
                    }
                  });
                }
              }
              s3.deleteBucket({Bucket: parentBucket + '/' + req.params.user}, function(err, data) {
                if (err) {
                  sendRes(res, 'error');
                } else {
                  ee.emit('s3done');
                }
              });
            }
          });
        }
      });

      fs.rename(__dirname + '/../files/' + req.params.user, __dirname + '/../files/' + req.body.name, function(err) {
        if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('hdDone');
        }
      });

      User.update({name: req.params.user}, req.body, function(err, user) {
        if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('mongodbDone');
        }
      });

      ee.on('s3done', function() {
        s3done = true;
        sendRes(res, message);
      });
      ee.on('mongodbDone', function() {
        mongodbDone = true;
        sendRes(res, message);
      });
      ee.on('hdDone', function() {
        hdDone = true;
        sendRes(res, message);
      });
    })

    //Deletes a user and all their files across mongodb, hard disc, and s3
    .delete(function(req, res) {
      var ee                = new EventEmitter();
      var message           = 'succesfully deleted directory for: ' + req.params.user;
      var params            = {Bucket: parentBucket};
      s3done                = false;
      mongodbDone           = false;
      hdDone                = false;
      params.Delete         = {};
      params.Delete.Objects = [];

      s3.listObjects({Bucket: parentBucket, Prefix: req.params.user + '/'}, function(err, data) {
        if (err) {
          sendRes(res, 'error');
        } else {
          for (var i = 0; i < data.Contents.length; i++) {
            params.Delete.Objects.push({Key: data.Contents[i].Key});
            if (i === data.Contents.length - 1) {
              s3.deleteObjects(params, function(err, data) {
                if (err) {
                  sendRes(res, 'error');
                }
              });
            }
          }
          s3.deleteBucket({Bucket: parentBucket + '/' +req.params.user}, function(err, data) {
            if (err) {
              sendRes(res, 'error');
            } else {
              ee.emit('s3done');
            }
          });
        }
      });

      fs.readdir(__dirname + '/../files/' + req.params.user, function(err, files) {
        if (err) {
          sendRes(res, 'error');
        } else {
          for (var i = 0; i < files.length; i++) {
            fs.unlinkSync(__dirname + '/../files/' + req.params.user + '/' + files[i]);
          }
          fs.rmdir(__dirname + '/../files/' + req.params.user, function(err) {
            if (err) {
              sendRes(res, 'error');
            } else {
              ee.emit('hdDone');
            }
          });
        }
      });

      User.findOne({name: req.params.user}, function (err, user){
        if (err) {
          sendRes(res, 'error');
        } else {
          var ownerId = user._id;
          File.remove({user: ownerId}, function(err) {
            if (err) {
              sendRes(res, 'error');
            } else {
              User.remove({name: req.params.user}, function(err){
                if (err) {
                  sendRes(res, 'error');
                } else {
                  ee.emit('mongodbDone');
                }
              });
            }
          });
        }
      });

      ee.on('s3done', function() {
        s3done = true;
        sendRes(res, message);
      });
      ee.on('mongodbDone', function() {
        mongodbDone = true;
        sendRes(res, message);
      });
      ee.on('hdDone', function() {
        hdDone = true;
        sendRes(res, message);
      });
    });
};

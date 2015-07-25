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

  router.route('/users/:user/files')
    //Gets a list of files for a specific user
    //by finding that user and populating the files field
    //it then returns the list fo files.
    .get(function(req, res) {
      User.findOne({name: req.params.user})
            .populate('files')
            .exec(function(err, user) {
              if (err) {
                sendRes(res, 'error');
              }
              res.json(user.files);
            });
    })
    //Post a new file for a user
    //writes the file to the hard drive in folder with user name
    //stores the file on s3 and stores the url for the file in the mongodb file
    //then links the file to the user in the mongodb
    .post(function(req, res) {
      var ee      = new EventEmitter();
      var message = 'succesfully created file: ' + req.body.name;
      var dirFile = req.params.user +'/' + req.body.name;
      s3done      = false;
      mongodbDone = false;
      hdDone      = false;

      s3.putObject({ Bucket: parentBucket, Key: dirFile, Body: req.body.content }, function(err, data) {
        if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('s3done');
        }
      });

      fs.writeFile(__dirname + '/../files/' + dirFile, req.body.content, function(err) {
        if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('hdDone');
        }
      });

      ee.on('s3done', function() {
        var file  = new File();
        s3done    = true;
        file.name = req.body.name;
        User.findOne({name: req.params.user}, function(err, found) {
          if (err) {
            sendRes(res, 'error');
          }
          found.files.push(file._id);
          file.user = found._id;
          found.save(function(err, file) {
            if (err) {
              sendRes(res, 'error');
            }
          });
          file.url = s3.getSignedUrl('getObject', {Bucket: parentBucket, Key: dirFile});
          file.save(function(err, file) {
            if (err) {
              sendRes(res, 'error');
            } else {
              ee.emit('mongodbDone');
            }
          });
        });
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

    //deletes all files for a given user from the disc, mongodb and s3
    .delete(function(req, res) {
      var ee                = new EventEmitter();
      var message           = 'deleted all files for: ' + req.params.user;
      s3done                = false;
      mongodbDone           = false;
      hdDone                = false;
      var params            = {Bucket: parentBucket};
      params.Delete         = {};
      params.Delete.Objects = [];

      fs.readdir(__dirname + '/../files/' + req.params.user, function(err, files) {
        if (err) {
          sendRes(res, 'error');
        } else {
          for (var i = 0; i < files.length; i++) {
            fs.unlinkSync(__dirname + '/../files/' + req.params.user + '/' + files[i]);
          }
          ee.emit('hdDone');
        }
      });

      s3.listObjects({Bucket: parentBucket, Prefix: req.params.user + '/'}, function(err, data) {
        if (err) {
          sendRes(res, 'error');
        } else {
          for (var i = 0; i < data.Contents.length; i++) {
            params.Delete.Objects.push({Key: data.Contents[i].Key});
          }
          s3.deleteObjects(params, function(err, data) {
            if (err) {
              sendRes(res, 'error');
            } else {
              ee.emit('s3done');
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
              user.files = [];
              user.save();
              ee.emit('mongodbDone');
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

  router.route('/users/:user/files/:file')
    //Gets specific file from mongodb containing link to file on aws
    //sends to user as json.
    .get(function(req, res) {
      File.findOne({name: req.params.file})
            .exec(function(err, file) {
              if (err) {
                sendRes(res, 'error');
              }
              res.json(file);
            });
    })
    //updates a file across mongo, hard disc, s3
    //first checks to see if the change is just to the name
    //if it is it renames the file on the disc, creates a copy of the object on s3
    //with the new name, updates mongodb with new file name and url and finally
    //deletes the original object on s3.
    //If the change is to name and contents it deletes the old file on disc, and
    //old file in s3, creates a new file on disc and s3, and finally updates the
    //mongodb file listing.
    .put(function(req, res) {
      var ee         = new EventEmitter();
      var message    = 'Renamed: ' + req.params.file + ' to: ' + req.body.name;
      var oldDirFile = req.params.user + '/' + req.params.file;
      var newDirFile = req.params.user + '/' + req.body.name;
      s3done         = false;
      mongodbDone    = false;
      hdDone         = false;

      if (!req.body.content && req.params.file !== req.body.name) {
        fs.rename(__dirname + '/../files/' + oldDirFile, __dirname + '/../files/' + newDirFile, function(err) {
          if (err) {
            sendRes(res, 'error');
          } else {
            ee.emit('hdDone');
          }
        });

        s3.copyObject({Bucket: parentBucket, Key: newDirFile, CopySource: parentBucket + '/' + oldDirFile }, function(err, data) {
          if (err) {
            sendRes(res, 'error');
          } else {
            s3.deleteObject({Bucket: parentBucket, Key: oldDirFile}, function(err, data) {
              if (err) {
                sendRes(res, 'error');
              } else {
                ee.emit('s3doneName');
              }
            });
          }
        });
      } else {
        fs.unlink(__dirname + '/../files/' + oldDirFile, function(err){
          if (err) {
            sendRes(res, 'error');
          } else {
            fs.writeFile(__dirname + '/../files/' + newDirFile, req.body.content, function(err) {
              if (err) {
                sendRes(res, 'error');
              } else {
                ee.emit('hdDone');
              }
            });
          }
        });

        s3.putObject({ Bucket: parentBucket, Key: newDirFile, Body: req.body.content }, function(err, data) {
          if (err) {
            sendRes(res, 'error');
          } else {
            s3.deleteObject({Bucket: parentBucket, Key: oldDirFile}, function(err, data) {
              if (err) {
                sendRes(res, 'error');
              } else {
                ee.emit('s3done');
              }
            });
          }
        });
      }

      ee.on('s3doneName', function() {
        s3done = true;
        var newUrl = s3.getSignedUrl('getObject', {Bucket: parentBucket, Key: newDirFile});
        File.update({name: req.params.file}, {name: req.body.name, url: newUrl}, function(err, file) {
          if (err) {
            sendRes(res, 'error');
          } else {
            ee.emit('mongodbDone');
          }
        });
      });
      ee.on('s3done', function() {
        s3done = true;
        var newUrl = s3.getSignedUrl('getObject', {Bucket: parentBucket, Key: newDirFile});
        File.update({name: req.params.file}, {name: req.body.name, url: newUrl}, function(err, file) {
          if (err) {
            sendRes(res, 'error');
          } else {
            ee.emit('mongodbDone');
          }
        });
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
    //Deletes specific file from mongodb, disc, and S3
    .delete(function(req, res) {
      var ee      = new EventEmitter();
      var message = 'successfully deleted: ' + req.params.file;
      var dirFile = req.params.user + '/' + req.params.file;
      s3done      = false;
      mongodbDone = false;
      hdDone      = false;

      File.remove({name: req.params.file}, function(err){
        if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('mongodbDone');
        }
      });

      fs.unlink(__dirname + '/../files/' + dirFile, function(err){
        if (err) {
          sendRes(res, 'error');
        } else {
          ee.emit('hdDone');
        }
      });

      s3.deleteObject({Bucket: parentBucket, Key: dirFile}, function(err, data) {
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
};

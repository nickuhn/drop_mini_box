var bodyParser = require('body-parser');
var fs = require('fs');
var File = require(__dirname + '/../models/File');
var User = require(__dirname + '/../models/User');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var parentBucket = 'nickuhnbucket';

module.exports = function(router) {
  router.use(bodyParser.json());

  router.route('/users/:user/files')
    //Gets a list of files for a specific user
    //by finding that user and populating the files field
    //it then returns the list fo files.
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
    //Post a new file for a user
    //writes the file to the hard drive in folder with user name
    //then links the file to the user in the mongodb
    //stores the file on s3 and stores the url for the file in the mongodb file
    .post(function(req, res) {
      fs.writeFile(__dirname + '/../files/' + req.params.user +'/' + req.body.name, req.body.content, function(err) {
        if (err) {
          res.send(err);
        } else {
          var file = new File();
          file.name = req.body.name;
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
            s3.putObject({ Bucket: parentBucket, Key: req.params.user +'/' + req.body.name, Body: req.body.content }, function(err, data) {
              if (err) {
                res.send(err);
              } else {
                file.url = s3.getSignedUrl('getObject', {Bucket: parentBucket, Key: req.params.user +'/' + req.body.name});
                file.save(function(err, file) {
                  if (err) {
                    res.send(err);
                  } else {
                    res.send(file);
                  }
                });
              }
            });
          });
        }
      });
    })
    //deletes all files for a given user from the disc, mongodb and s3
    .delete(function(req, res) {
      fs.readdir(__dirname + '/../files/' + req.params.user, function(err, files) {
        if (err) {
          res.send(err);
        } else {
          for (var i = 0; i < files.length; i++) {
            fs.unlinkSync(__dirname + '/../files/' + req.params.user + '/' + files[i]);
            s3.deleteObject({Bucket: parentBucket, Key: req.params.user + '/' + files[i]}, function(err, data) {
              if (err) {
                res.send(err);
              }
            });
          }
        }
        User.findOne({name: req.params.user}, function (err, user){
          if (err) {
            res.send(err);
          } else {
            var ownerId = user._id;
            File.remove({user: ownerId}, function(err) {
              if (err) {
                res.send(err);
              } else {
                user.files = [];
                user.save();
                res.send({msg: 'deleted all files for: ' + req.params.user});
              }
            });
          }
        });
      });
    });

  router.route('/users/:user/files/:file')
    //Gets specific file from mongodb containing link to file on aws
    //sends to user as json.
    .get(function(req, res) {
      File.findOne({name: req.params.file})
            .exec(function(err, file) {
              if (err) {
                res.send(err);
              }
              res.send(file);
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
      if (!req.body.content && req.params.file !== req.body.name) {
        fs.rename(__dirname + '/../files/' + req.params.user + '/' + req.params.file, __dirname + '/../files/' + req.params.user + '/' + req.body.name, function(err) {
          if (err) {
            res.send(err);
          } else {
            s3.copyObject({Bucket: parentBucket, Key: req.params.user + '/' + req.body.name, CopySource: parentBucket + '/' + req.params.user + '/' + req.params.file }, function(err, data) {
              if (err) {
                res.send(err);
              } else {
                var newUrl = s3.getSignedUrl('getObject', {Bucket: parentBucket, Key: req.params.user +'/' + req.body.name});
                File.update({name: req.params.file}, {name: req.body.name, url: newUrl}, function(err, file) {
                  if (err) {
                    res.send(err);
                  } else {
                    s3.deleteObject({Bucket: parentBucket, Key: req.params.user + '/' + req.params.file}, function(err, data) {
                      if (err) {
                        res.send(err);
                      } else {
                        res.send({msg: 'Renamed: ' + req.params.file + ' to: ' + req.body.name});
                      }
                    });
                  }
                });
              }
            });
          }
        });
      } else {
        fs.unlink(__dirname + '/../files/' + req.params.user +'/' + req.params.file, function(err){
          if (err) {
            res.send(err);
          } else {
            fs.writeFile(__dirname + '/../files/' + req.params.user +'/' + req.body.name, req.body.content, function(err) {
              if (err) {
                res.send(err);
              } else {
                s3.putObject({ Bucket: parentBucket, Key: req.params.user +'/' + req.body.name, Body: req.body.content }, function(err, data) {
                  if (err) {
                    res.send(err);
                  } else {
                    var newUrl = s3.getSignedUrl('getObject', {Bucket: parentBucket, Key: req.params.user +'/' + req.body.name});
                    File.update({name: req.params.file}, {name: req.body.name, url: newUrl}, function(err, file) {
                      if (err) {
                        res.send(err);
                      } else {
                        s3.deleteObject({Bucket: parentBucket, Key: req.params.user + '/' + req.params.file}, function(err, data) {
                          if (err) {
                            res.send(err);
                          } else {
                            res.send({msg: 'Renamed: ' + req.params.file + ' to: ' + req.body.name});
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
    })
    //Deletes specific file from mongodb, disc, and S3
    .delete(function(req, res) {
      File.remove({name: req.params.file}, function(err){
        if (err) {
          res.send(err);
        } else {
          fs.unlink(__dirname + '/../files/' + req.params.user +'/' + req.params.file, function(err){
            if (err) {
              res.send(err);
            } else {
              s3.deleteObject({Bucket: parentBucket, Key: req.params.user + '/' + req.params.file}, function(err, data) {
                if (err) {
                  res.send(err);
                } else {
                  res.send({msg: 'successfully deleted: ' + req.params.file});
                }
              });
            }
          });
        }
      });
    });

};

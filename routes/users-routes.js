var bodyParser = require('body-parser');
var fs = require('fs');

module.exports = function(router) {
  router.use(bodyParser.json());

  router.route('/users')
    .get(function(req, res) {
      fs.readdir(__dirname + '/../files', function(err, files) {
        if (err) {
          res.status(500).json({msg:'server error'});
        }
        res.send({msg: files});
      });
    })

    .post(function(req, res) {
      fs.mkdir(__dirname + '/../files/' + req.body.name, function(err) {
        if (err) {
          res.status(500).json({msg:'server error'});
        }
      });
      res.send({msg: 'succesfully created directory for: ' + req.body.name});
    });

  router.route('/users/:user')
    .put(function(req, res) {
      fs.rename(__dirname + '/../files/' + req.params.user, __dirname + '/../files/' + req.body.name, function(err) {
        if (err) {
          res.status(500).json({msg:'server error'});
        }
      });
      res.send({msg: 'Renamed Directory: ' + req.params.user + ' to: ' + req.body.name});
    })

    .delete(function(req, res) {
      fs.rmdir(__dirname + '/../files/' + req.params.user, function(err) {
        if (err) {
          res.status(500).json({msg:'server error'});
        }
      });
      res.send({msg: 'succesfully deleted directory for: ' + req.params.user});
    });

};

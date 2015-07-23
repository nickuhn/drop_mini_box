var bodyParser = require('body-parser');
var fs = require('fs');

module.exports = function(router) {
  router.use(bodyParser.json());

  function handleErrors(err) {
    return res.status(500).json({msg:'server error'});
  }

  router.route('/users/:user/files')
    .get(function(req, res) {
      res.send({msg: 'GET on /users/:user/files'});
    })

    .post(function(req, res) {
      res.send({msg: 'POST on /users/:user/files'});
    });

  router.route('/users/:user/files/:file')
    .put(function(req, res) {
      res.send({msg: 'PUT on /users/:user/files/:file'});
    })

    .delete(function(req, res) {
      res.send({msg: 'DELETE on /users/:user/files/:file'});
    });

};

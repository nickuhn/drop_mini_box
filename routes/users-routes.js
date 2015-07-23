var bodyParser = require('body-parser');
var fs = require('fs');

module.exports = function(router) {
  router.use(bodyParser.json());

  function handleErrors(err) {
    return res.status(500).json({msg:'server error'});
  }

  router.route('/users')
    .get(function(req, res) {
      res.send({msg: 'GET on /users'});
    })

    .post(function(req, res) {
      res.send({msg: 'POST on /users'});
    })

  router.route('/users/:user')
    .put(function(req, res) {
      res.send({msg: 'PUT on /users/:user'});
    })

    .delete(function(req, res) {
      res.send({msg: 'DELETE on /users/:user'});
    })


}
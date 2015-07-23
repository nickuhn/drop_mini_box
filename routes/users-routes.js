var bodyParser = require('body-parser');
var fs = require('fs');

module.exports = function(router) {
  router.use(bodyParser.json());

  function handleErrors(err) {
    return res.status(500).json({msg:'server error'});
  }

  router.route('/users')
    .get(function(req, res) {
      res.send({msg: 'get on /users'});
    })

    .post(function(req, res) {
      res.send({msg: 'POST on /users'});
    })

  router.route('/users/:user')
    .put(function(req, res) {
      res.send({msg: 'put on /users/:user'});
    })

    .delete(function(req, res) {
      res.send({msg: 'POST on /users/:user'});
    })

  router.route('/users/:user/files')
    .get(function(req, res) {
      res.send({msg: 'get on /users/:user/files'});
    })

    .post(function(req, res) {
      res.send({msg: 'POST on /users/:user/files'});
    })

  router.route('/users/:user/files/:file')
    .put(function(req, res) {
      res.send({msg: 'put on /users/:user/files/:file'});
    })

    .delete(function(req, res) {
      res.send({msg: 'POST on /users/:user/files/:file'});
    })



}

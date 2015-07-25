var fs               = require('fs');
var chai             = require('chai');
var mocha            = require('mocha');
var server           = require(__dirname + '/../server');
var chaiHttp         = require('chai-http');
var expect           = chai.expect;
process.env.MONGOURI = 'mongodb://localhost/userTest_db';
chai.use(chaiHttp);

describe('Users REST API', function() {
  it('should respond to POST /users by storing and returning a user', function(done) {
    chai.request('localhost:3000')
      .post('/api/users')
      .send({name: 'SirTestsalot'})
      .end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.status).to.eql(200);;
        expect(res).to.be.json;
        done();
      });
  });
  it('should respond to GET /users with list of users', function(done) {
    chai.request('localhost:3000')
      .get('/api/users')
      .end(function(err, res) {
        expect(err).to.eql(null)
        expect(res.status).to.eql(200)
        expect(res).to.be.json;
      done();
      });
  });
  it('should respond to PUT /users/:user by updating and returning a user', function(done) {
    chai.request('localhost:3000')
      .put('/api/users/SirTestsalot')
      .send({name: 'Carl'})
      .end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.status).to.eql(200);;
        expect(res).to.be.json;
        done();
      });
  });
  it('should respond to DELETE /users/:user by deleting the user', function(done) {
    chai.request('localhost:3000')
      .del('/api/users/Carl')
      .end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.status).to.eql(200);;
        expect(res).to.be.json;
        done();
      });
  });
});

describe('Files REST API', function() {
  before(function(done) {
    chai.request('localhost:3000')
      .post('/api/users')
      .send({name: 'SirTestsalot'})
      .end();
      done();
  })
  it('should respond to POST /users/:user/files by storing and returning a file to a user', function(done) {
    chai.request('localhost:3000')
      .post('/api/users/SirTestsalot/files')
      .send({name: 'testing.txt',
             contents: 'lots of text about testing'
            })
      .end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.status).to.eql(200);;
        expect(res).to.be.json;
        done();
      });
  });
  it('should respond to PUT /users/:user/files/:file by updating and returning a specific file', function(done) {
    chai.request('localhost:3000')
      .put('/api/users/SirTestsalot/files/testing.txt')
      .send({name: 'changed.txt', contents: 'boom overwritten'})
      .end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.status).to.eql(200);;
        expect(res).to.be.json;
        done();
      });
  });
  it('should respond to GET /users/:user/files with list of users files', function(done) {
    chai.request('localhost:3000')
      .get('/api/users/SirTestsalot/files')
      .end(function(err, res) {
        expect(err).to.eql(null)
        expect(res.status).to.eql(200)
        expect(res).to.be.json;
      done();
      });
  });
  it('should respond to DELETE /users/:user/files/:file by deleting a specific file', function(done) {
    chai.request('localhost:3000')
      .del('/api/users/SirTestsalot/files/changed.txt')
      .end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.status).to.eql(200);;
        expect(res).to.be.json;
        done();
      });
  });
  after(function(done) {
    chai.request('localhost:3000')
      .delete('/api/users/SirTestsalot')
      .end();
      done();
  })
});

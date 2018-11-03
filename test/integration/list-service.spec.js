'use strict';

const expect = require('chai').expect;
const hippie = require('hippie');

const errors = require('../../app/model/errors');
const server = require('../../app/server');
const {cleanUpDb, createList} = require('./integration-test-utils');

describe('/todo/api/lists', function () { 
  this.timeout(5000);
  beforeEach(cleanUpDb);

  describe('post', function () {
    it('should fail due to missing name', function(done) {
      hippie(server)
        .json()
        .post('/todo/api/lists')
        .expectStatus(400)
        .end(function(error, response) {
          if (error) {
            done(error);
            return;
          }
          expect(JSON.parse(response.body)).to.include(errors.InvalidListName);
          done();
        });
    });

    it('should fail due to invalid name', function(done) {
      hippie(server)
        .json()
        .post('/todo/api/lists')
        .send({
          name: 'a'.repeat(401)
        })
        .expectStatus(400)
        .end(function(error, response) {
          if (error) {
            done(error);
            return;
          }
          expect(JSON.parse(response.body)).to.include(errors.InvalidListName);
          done();
        });
    });

    it('should fail due to id provided', function(done) {
      hippie(server)
        .json()
        .post('/todo/api/lists')
        .send({
          id: 'some id',
          name: 'list with id'
        })
        .expectStatus(400)
        .end(function(error, response) {
          if (error) {
            done(error);
            return;
          }
          expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
          done();
        });
    });

    function testListCreation(listName, done) {
      createList(server, listName)
        .then(function(list) {
          expect(list).to.include({ name: listName})
                      .and.to.have.property('id').that.is.a('number');
          done();
        })
        .catch(done);
    }

    it('should create a list', function(done) {
      testListCreation('test list', done);
    });

    it('should create a list using maximum allowed name length', function(done) {
      testListCreation('a'.repeat(400), done);
    });
  })
});

describe('/todo/api/lists/:listId', function () { 
  this.timeout(5000);
  beforeEach(cleanUpDb);

  describe('get', function() {
    it('should fail if list does not exist', function(done) {
      hippie(server)
        .json()
        .get('/todo/api/lists/1')
        .expectStatus(404)
        .end(done);
    });

    it('should fail if list id is not a number', async function() {
      let response = await hippie(server)
                              .json()
                              .get('/todo/api/lists/InvalidId')
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should return the list with that id', async function() {
      let storedList = await createList(server, 'test list');
      let response = await hippie(server)
                              .json()
                              .get('/todo/api/lists/' + storedList.id)
                              .expectStatus(200)
                              .end();
      let listFound = JSON.parse(response.body);
      expect(listFound).to.be.deep.equal(storedList);
    });
  });


  describe('delete', function() {
    it('should pass if list does not exist', async function() {
      let response = await hippie(server)
                              .json()
                              .del('/todo/api/lists/1')
                              .expectStatus(404)
                              .end();
      
      expect(JSON.parse(response.body)).to.include(errors.ListNotFound);
    });

    it('should fail if list id is not a number', async function() {
      let response = await hippie(server)
                              .json()
                              .del('/todo/api/lists/InvalidId')
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should delete the list with that id', async function(){
      let storedList = await createList(server, 'test list');

      await hippie(server)
                  .json()
                  .del('/todo/api/lists/' + storedList.id)
                  .expectStatus(204)
                  .end();
      
      return hippie(server)
                   .json()
                   .get('/todo/api/lists/' + storedList.id)
                   .expectStatus(404)
                   .end();
    });
  });
});
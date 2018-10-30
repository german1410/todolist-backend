'use strict';

const mongoose = require('mongoose');
const expect = require('chai').expect;
const hippie = require('hippie');

const errors = require('../../app/model/errors');
const config = require('../../app/config/todo-service-config');
const server = require('../../app/server');

async function dropCollection(collectionName) {
  return new Promise(function (resolve, reject) {
    mongoose.connection.db.listCollections({name: collectionName})
                          .next(function(err, collinfo) {
                              if (err) {
                                reject(err);
                              }

                              if (collinfo) {
                                return mongoose.connection.dropCollection(collectionName)
                                                          .then(resolve, reject);
                              } else {
                                resolve();
                              }
                          });
  });

}

function createList(server, listName) {
  return new Promise(function(resolve, reject) {
        hippie(server)
                .json()
                .post('/todo/api/lists')
                .send({
                  name: listName
                })
                .expectStatus(201)
                .end()
                  .then(function (response) {
                    let parsedBody = JSON.parse(response.body);
                    resolve(parsedBody);
                  })
                  .catch(reject);
   });
}

describe('/todo/api/lists', function () { 
  this.timeout(5000);
  beforeEach(async function () {
    try {
      await mongoose.connect(config.db.url);
      await dropCollection('todo_lists');
      await dropCollection('todo_list_counters');
    } catch (error) {
      throw error;
    }
  });

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
  beforeEach(async function () {
    try {
      await mongoose.connect(config.db.url);
      await dropCollection('todo_lists');
      await dropCollection('todo_list_counters');
    } catch (error) {
      throw error;
    }
  });

  describe('get', function() {
    it('should fail if list does not exist', function(done) {
      hippie(server)
        .json()
        .get('/todo/api/lists/1')
        .expectStatus(404)
        .end(function(error) {
          if (error) {
            done(error);
            return;
          }
          done();
        });
    });

    it('should fail if list id is not a number', function(done) {
      hippie(server)
        .json()
        .get('/todo/api/lists/InvalidId')
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

    it('should return the list with that id', function(done){
      createList(server, 'test list')
        .then(function(storedList) {
            hippie(server)
                  .json()
                  .get('/todo/api/lists/' + storedList.id)
                  .expectStatus(200)
                  .end()
                    .then(function(response) {
                      let listFound = JSON.parse(response.body);
                      expect(listFound).to.be.deep.equal(storedList);
                      done();
                    })
                    .catch(done);
        })
        .catch(done);
    });
  });


  describe('delete', function() {
    it('should pass if list does not exist', function(done) {
      hippie(server)
        .json()
        .del('/todo/api/lists/1')
        .expectStatus(204)
        .end(done);
    });

    it('should fail if list id is not a number', function(done) {
      hippie(server)
        .json()
        .del('/todo/api/lists/InvalidId')
        .expectStatus(400)
        .end(function(error, response) {
          if (error) {
            done(error);
          } else {
            expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
            done();
          }
        });
    });

    it('should delete the list with that id', function(done){
      createList(server, 'test list')
        .then(function(storedList) {
            hippie(server)
                  .json()
                  .del('/todo/api/lists/' + storedList.id)
                  .expectStatus(204)
                  .end()
                    .then(function() {
                      hippie(server)
                        .json()
                        .get('/todo/api/lists/' + storedList.id)
                        .expectStatus(404)
                        .end(done);
                    })
                    .catch(done);
        })
        .catch(done);
    });
  });
});
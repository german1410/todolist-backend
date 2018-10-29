'use strict';

const mongoose = require('mongoose');
const expect = require('chai').expect;
const hippie = require('hippie');

const errors = require('../../app/model/errors');
const config = require('../../app/config/todo-service-config');
const server = require('../../app/server');

describe('/todo/api/lists', function () { 
  this.timeout(5000);
  beforeEach(async function () {
    try {
      await mongoose.connect(config.db.url);
      mongoose.connection.db.listCollections({name: 'todolists'})
                            .next(function(err, collinfo) {
                                if (collinfo) {
                                  return mongoose.connection.dropCollection('todolists')
                                }
                            });
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
          }
          expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
          done();
        });
    });

    function testListCreation(listName, done) {
      hippie(server)
        .json()
        .post('/todo/api/lists')
        .send({
          name: listName
        })
        .expectStatus(200)
        .end(function(error, response) {
          if (error) {
            done(error);
          }
          expect(JSON.parse(response.body)).to.include({ name: listName})
                                          .and.to.have.property('id').that.is.not.empty;
          done();
        });
    }

    it('should create a list', function(done) {
      testListCreation('test list', done);
    });

    it('should create a list using maximum allowed name length', function(done) {
      testListCreation('a'.repeat(400), done);
    });
  })
});
'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const hippie = require('hippie');

const errors = require('../../app/model/errors');
const modelConstants = require('../../app/model/model-constants');
const server = require('../../app/server');
const {cleanUpDb, createList, createTodo} = require('./integration-test-utils');

let todoToCreate = {
  description: 'I need to do abc task'
};

function verifyTodoOnResponse(response) {
  let validator = expect(JSON.parse(response.body));
  validator.to.include(todoToCreate);
  validator.to.have.property('id').that.is.a('number');
  validator.to.have.property('creation_date').that.is.a('number');
  validator.to.have.property('last_update_date').that.is.a('number');
  validator.not.to.have.property('due_date');
  validator.to.have.property('state').to.be.oneOf(_.values(modelConstants.todoStates));
}

function verifyTodoOnUpdateResponse(response, expected) {
  let validator = expect(JSON.parse(response.body));
  validator.to.have.property('description').that.eql(expected.description);
  validator.to.have.property('id').that.eql(expected.id);
  validator.to.have.property('creation_date').to.be.eql(expected.creation_date);
  validator.to.have.property('last_update_date').to.be.gte(expected.last_update_date);
  validator.to.have.property('state').eql(expected.state);

  if (_.includes(_.keys(expected), 'due_date')) {
    validator.to.have.property('due_date').eql(expected.due_date);
  } else {
    validator.not.to.have.property('due_date');
  }
}


describe('/todo/api/lists/:listId/todos', function () { 
  this.timeout(5000);
  beforeEach(cleanUpDb);

  let storedList;
  beforeEach(async function () {
    storedList = await createList(server, 'test list');
  })

  describe('post', function () {
    it('should fail if list does not exist', async function () {
      return hippie(server)
            .json()
            .post('/todo/api/lists/24564545/todos')
            .send(todoToCreate)
            .expectStatus(404)
            .end();
    });
    it('should fail if list id is not a number', async function() {
      let response = await hippie(server)
                              .json()
                              .post('/todo/api/lists/NotValidListId/todos')
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should fail if ToDo is not sent', async function() {
      let response = await hippie(server)
                              .json()
                              .post(`/todo/api/lists/${storedList.id}/todos`)
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.InvalidTodoEntry);
    });

    it('should fail if ToDo description is not sent', async function() {
      let response = await hippie(server)
                              .json()
                              .post(`/todo/api/lists/${storedList.id}/todos`)
                              .send({
                                dueDate: new Date().getTime()
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.InvalidTodoEntry);
    });

    it('should fail if ToDo has an id', async function() {
      let response = await hippie(server)
                              .json()
                              .post(`/todo/api/lists/${storedList.id}/todos`)
                              .send({
                                id: 12354,
                                description: 'I need to do abc task'
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should create a new ToDo', async function() {
      let response = await hippie(server)
            .json()
            .post(`/todo/api/lists/${storedList.id}/todos`)
            .send(todoToCreate)
            .expectStatus(201)
            .end();

      verifyTodoOnResponse(response);
    });
  });

  function bulkCreateTodos(bulkStep, bulkSize, todoAcumulator) {
    let tasks = _.range(bulkSize).map(index => 
      new Promise(function (resolve, reject) {
        let taskNumber = bulkSize * bulkStep + index;
        let todoToCreate = {
          description: `Task number ${taskNumber}`
        };

        createTodo(server, storedList.id, todoToCreate, 5000)
                  .then(function (todo) {
                          todoAcumulator.push(todo);
                  })
                  .then(resolve, reject);
        })
    );

    return Promise.all(tasks);
  }

  describe('get', function () {
    it('should fail if list id is not a number', async function() {
      let response = await hippie(server)
                              .json()
                              .get('/todo/api/lists/NotValidListId/todos')
                              .send()
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should fail if list does not exist', async function () {
      let response = await hippie(server)
                                .json()
                                .get('/todo/api/lists/24564545/todos')
                                .send()
                                .expectStatus(404)
                                .end();

      expect(JSON.parse(response.body)).to.include(errors.ListNotFound);
    });

    it('should fail if pagination parameters are not valid', async function() {

      let response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos`)
                              .qs({
                                index: 'asc'
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.InvalidPaginationParams);

      response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos`)
                              .qs({
                                limit: 'asc'
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.InvalidPaginationParams);

      response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos`)
                              .qs({
                                orderBy: 'nothing'
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.InvalidPaginationParams);

      response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos`)
                              .qs({
                                orderBy: '1'
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.InvalidPaginationParams);

       response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos`)
                              .qs({
                                orderBy: 'creation_date',
                                orderDirection: 'up'
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.InvalidPaginationParams);
    });

    it('should fail if orderDirection is present but not orderBy', async function() {
      let response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos`)
                              .qs({
                                orderDirection: 'asc'
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.InvalidPaginationParams);
    });

    it('should return todos with default limit and order', async function() {
      this.timeout(10000);
      
      let storedTodos = await createTodosForTest();
      storedTodos = _.orderBy(storedTodos, ['creation_date', 'id'], ['desc', 'asc']);

      let response = await hippie(server)
            .json()
            .get(`/todo/api/lists/${storedList.id}/todos`)
            .send()
            .expectStatus(200)
            .end();

      let todoPageResponse = JSON.parse(response.body);
      verifyTodoOnResponse(todoPageResponse, _.slice(storedTodos, 0, 10));
    }); 

    it('should return todos with specified index and limit', async function() {
      this.timeout(10000);
      
      let storedTodos = await createTodosForTest();
      storedTodos = _.orderBy(storedTodos, ['creation_date', 'id'], ['desc', 'asc']);

      let response = await hippie(server)
            .json()
            .get(`/todo/api/lists/${storedList.id}/todos`)
            .qs({
              index: 5,
              limit: 15
            })
            .send()
            .expectStatus(200)
            .end();

      let todoPageResponse = JSON.parse(response.body);
      verifyTodoOnResponse(todoPageResponse, _.slice(storedTodos, 5, 20));
    }); 

    it('should return todos with specified order', async function() {
      this.timeout(10000);
      
      let storedTodos = await createTodosForTest();
      storedTodos = _.orderBy(storedTodos, ['last_update_date', 'id'], ['asc', 'asc']);

      let response = await hippie(server)
            .json()
            .get(`/todo/api/lists/${storedList.id}/todos`)
            .qs({
              index: 8,
              limit: 15,
              orderBy: 'last_update_date',
              orderDirection: 'asc'
            })
            .send()
            .expectStatus(200)
            .end();

      let todoPageResponse = JSON.parse(response.body);
      verifyTodoOnResponse(todoPageResponse, _.slice(storedTodos, 8, 23));
    }); 

    async function createTodosForTest() {
      let storedTodos = [];

      // Chain creation in bulks of 10
      await bulkCreateTodos(0, 10, storedTodos)
                .then(() => { return bulkCreateTodos(1, 10, storedTodos); })
                .then(() => { return bulkCreateTodos(2, 10, storedTodos); });

      return storedTodos;
    }

    function verifyTodoOnResponse(responseObject, expectedTodos) {
      // Verify pagination results
      let expectedResponse = {
        first: expectedTodos[0].id,
        last: expectedTodos[expectedTodos.length - 1].id,
        size: expectedTodos.length,
        todos: expectedTodos
      }
      expect(responseObject).to.be.eql(expectedResponse);
    }
  });
});


describe('/todo/api/lists/:listId/todos/:todoId', function () { 
  this.timeout(5000);
  beforeEach(cleanUpDb);

  let storedList;
  let todo;
  beforeEach(async function () {
    storedList = await createList(server, 'test list');
    todo = await createTodo(server, storedList.id, todoToCreate);
  })


  describe('delete', function () {
    it('should fail if list does not exist', async function () {
      return hippie(server)
            .json()
            .del('/todo/api/lists/24564545/todos/234435')
            .send(todoToCreate)
            .expectStatus(404)
            .end();
    });

    it('should fail if list id is not a number', async function() {
      let response = await hippie(server)
                              .json()
                              .del('/todo/api/lists/NotValidListId/todos/1')
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should fail if ToDo id is invalid', async function() {
      let response = await hippie(server)
                              .json()
                              .del(`/todo/api/lists/${storedList.id}/todos/InvalidId`)
                              .expectStatus(400)
                              .end();

      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should succedd if ToDo does not exist', async function() {
      return hippie(server)
                .json()
                .del(`/todo/api/lists/${storedList.id}/todos/233445654`)
                .expectStatus(204)
                .end();
    });

    it('should succedd if ToDo does exist', async function() {
      return hippie(server)
                .json()
                .del(`/todo/api/lists/${storedList.id}/todos/${todo.id}`)
                .expectStatus(204)
                .end();
      
    });
  });

  describe('get', function () {
    it('should fail if list does not exist', async function () {
      return hippie(server)
            .json()
            .get('/todo/api/lists/24564545/todos/234435')
            .expectStatus(404)
            .end();
    });
    it('should fail if list id is not a number', async function() {
      let response = await hippie(server)
                              .json()
                              .get('/todo/api/lists/NotValidListId/todos/1')
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should fail if ToDo id is invalid', async function() {
      let response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos/InvalidId`)
                              .expectStatus(400)
                              .end();

      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should fail if ToDo does not exist', async function() {
      let response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos/233445654`)
                              .expectStatus(404)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.TodoNotFound);      
    });

    it('should succeed if ToDo does exist', async function() {
      let response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos/${todo.id}`)
                              .expectStatus(200)
                              .end();

      verifyTodoOnResponse(response);
      
    });
  });

  describe('patch', function () {

    it('should fail if list does not exist', async function () {
      return hippie(server)
            .json()
            .patch('/todo/api/lists/24564545/todos/234435')
            .send({
              state: modelConstants.todoStates.Complete
            })
            .expectStatus(404)
            .end();
    });

    it('should fail if list id is not a number', async function() {
      let response = await hippie(server)
                              .json()
                              .patch('/todo/api/lists/NotValidListId/todos/1')
                              .send({
                                state: modelConstants.todoStates.Complete
                              })
                              .expectStatus(400)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should fail if ToDo id is invalid', async function() {
      let response = await hippie(server)
                              .json()
                              .patch(`/todo/api/lists/${storedList.id}/todos/InvalidId`)
                              .send({
                                state: modelConstants.todoStates.Complete
                              })
                              .expectStatus(400)
                              .end();

      expect(JSON.parse(response.body)).to.include(errors.IdNotAcceptable);
    });

    it('should fail if ToDo does not exist', async function() {
      let response = await hippie(server)
                              .json()
                              .get(`/todo/api/lists/${storedList.id}/todos/233445654`)
                              .send({
                                state: modelConstants.todoStates.Complete
                              })
                              .expectStatus(404)
                              .end();
      expect(JSON.parse(response.body)).to.include(errors.TodoNotFound);      
    });

    it('should partially update an existing ToDo', async function() {
      let response = await hippie(server)
                              .json()
                              .patch(`/todo/api/lists/${storedList.id}/todos/${todo.id}`)
                              .send({
                                state: modelConstants.todoStates.Complete
                              })
                              .expectStatus(200)
                              .end();

      let expected = _.assign({}, todo);
      expected.state = modelConstants.todoStates.Complete;
      verifyTodoOnUpdateResponse(response, expected);

      response = await hippie(server)
                          .json()
                          .get(`/todo/api/lists/${storedList.id}/todos/${todo.id}`)
                          .send()
                          .expectStatus(200)
                          .end();

      verifyTodoOnUpdateResponse(response, expected);
    });
  });
});

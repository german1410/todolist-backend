'use strict';

const TodoListConstroller = require('../controller/todo-list-controller');

let listConstroller = new TodoListConstroller();
function configureRoutes(server) {
  server.post('/todo/api/lists', listConstroller.createList);
  server.get('/todo/api/lists/:listId', listConstroller.getList);
}

module.exports = configureRoutes;
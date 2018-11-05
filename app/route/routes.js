'use strict';

const TodoListConstroller = require('../controller/todo-list-controller');
const TodoEntryConstroller = require('../controller/todo-list-entry-controller');

let listConstroller = new TodoListConstroller();
let todoEntryController = new TodoEntryConstroller();


/**
 * Configures all route handlers to the service
 * @function
 * @param {*} server Restify server on which paths will be configured to their specific controller
 */
function configureRoutes(server) {
  // List management
  server.post('/todo/api/lists', listConstroller.createList);
  server.get('/todo/api/lists/:listId', listConstroller.getList);
  server.del('/todo/api/lists/:listId', listConstroller.deleteList);

  // ToDo management
  server.post('/todo/api/lists/:listId/todos', todoEntryController.createTodo);
  server.get('/todo/api/lists/:listId/todos', todoEntryController.getTodos);
  server.get('/todo/api/lists/:listId/todos/:todoId', todoEntryController.getTodo);
  server.patch('/todo/api/lists/:listId/todos/:todoId', todoEntryController.updateTodo);
  server.del('/todo/api/lists/:listId/todos/:todoId', todoEntryController.deleteTodo);
}

module.exports = configureRoutes;
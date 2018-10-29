'use strict';

const createList = require('../controller/todo-list-controller');

function configureRoutes(server) {
  server.post('/todo/api/lists', createList);
}

module.exports = configureRoutes;
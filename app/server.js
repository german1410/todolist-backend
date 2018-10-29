'use strict';

const restify = require('restify');
const mongoose = require('mongoose');

const config = require('./config/todo-service-config');
const configureRoutes = require('./route/routes');
const logger = require('./util/logger');

logger.info('Start todo-list server. Configuration: ' + JSON.stringify(config));

let server = restify.createServer({
    name: 'todo-list'
});

server.use(restify.plugins.bodyParser());

configureRoutes(server);

mongoose.connect(config.db.url);
mongoose.connection.on('connected', function(error) {
  if (error) {
    throw error;
  }
  logger.debug('Db connected');
});

server.listen(config.service.port);

module.exports = server
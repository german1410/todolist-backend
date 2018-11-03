'use strict';

const restify = require('restify');
const mongoose = require('mongoose');

const config = require('./config/todo-service-config');
const configureRoutes = require('./route/routes');
const {logger, bunyanAdaptedLogger} = require('./util/logger');

logger.info('Start todo-list server. Configuration: ' + JSON.stringify(config));

let server = restify.createServer({
    name: 'todo-list',
    log: bunyanAdaptedLogger
});

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

configureRoutes(server);

server.on('uncaughtException', function (req, res, route, err) {
  logger.error('uncaughtException: %s - %s', err.name, err.message);
});

server.on('restifyError', function(req, res, err, callback) {
  logger.debug('Error on server: %s - %s', err.name, err.message);
  return callback();
});

mongoose.connect(config.db.url);
mongoose.connection.on('connected', function(error) {
  if (error) {
    throw error;
  }
  logger.debug('Db connected');
});

server.listen(config.service.port);

module.exports = server
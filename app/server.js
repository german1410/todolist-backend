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
server.use(restify.plugins.queryParser());

// Set up routes handed by the server
configureRoutes(server);

// Log unexpected exception 
server.on('uncaughtException', function (req, res, route, err) {
  logger.error('uncaughtException: %s - %s', err.name, err.message);
});

// Track restify error on debug just in case trouble shoot is requried
server.on('restifyError', function(req, res, err, callback) {
  logger.debug('Error on server: %s - %s', err.name, err.message);
  return callback();
});

// Start conneciton with mongo DB
mongoose.connect(config.db.url);
mongoose.connection.on('connected', function(error) {
  // Log an throw error but keep server up so errors are returned and module can be turned off
  if (error) {
    logger.error('Init: Error connecting to db: %s', error);
    throw error;
  }
  logger.debug('Db connected');
});

// Handle shutdown gracefully
process.on('SIGTERM', shutdownService);
process.on('SIGINT', shutdownService);
process.on('SIGKILL', shutdownService);

// Listent to te port for incomming requests
server.listen(config.service.port);

function shutdownService() {
  logger.info('Stoping server');
  server.close(() => {
    logger.info('Http server stopped.');
    // boolean means [force], see in mongoose doc
    mongoose.connection.close(false, () => {
      logger.info('DB connection closed.');
      process.exit(0);
    });
  });
}

module.exports = server
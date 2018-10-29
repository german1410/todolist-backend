'use strict';

const winston = require('winston');
const config = require('../config/todo-service-config');

const logger = winston.createLogger({
    level: config.development ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ dirname: 'log', filename: 'error.log', level: 'error' }),
      new winston.transports.File({ dirname: 'log', filename: 'todo-list.log' })
    ]
  });
   
  if (config.development) {
    logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));
  }
  
  module.exports = logger;
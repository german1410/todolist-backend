'use strict';

/**
 * ToDo List service configuration
 * 
 * @module config/todo-service-config 
 */

const _ = require('lodash');

let develpmentEnv = process.env.NODE_ENV === 'development';
let dbUrl = process.env.MONGO_DB_URL || 'mongodb://localhost:27017/todoList';

/**
 * Service configuration contains the following informaiton:
 * 
 * @property {boolean} production           - Indicates if service is configured to run in production environmnets
 * @property {boolean} development          - Indicates if service is configured to run in development environmnets
 * @property {object}  service              - Provides information specific to the server application
 * @property {number}  service.port         - Indicates the port on which the service will listent. Default port is 8080
 * @property {object}  db                   - Configuration properties specific for the DB connection
 * @property {string}  db.url               - Connection URL used to connect to the DB
 * @property {boolean} db.auto_create       - Wether or not to create the DB schema automatically. Only enabled for development environments.
 * @property {object}  search               - Properties specific for search operations
 * @property {number}  search.default_imit  - Default limit to use to list of ToDos when no limit is provided
 */
let config = {
  production: !develpmentEnv,
  development: develpmentEnv,
  service: {
    port:  _.parseInt(process.env.TODO_SRV_PORT) || 8080
  },
  db: {
    url: dbUrl,
    auto_create: develpmentEnv
  },
  search: {
    default_imit: _.parseInt(process.env.TODO_SERACH_DEFAULT_LIMIT) || 100
  }

}

module.exports= config;
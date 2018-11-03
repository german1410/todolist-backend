'use strict';

const _ = require('lodash');

let develpmentEnv = process.env.NODE_ENV === 'development';
let dbUrl = process.env.MONGO_DB_URL || 'mongodb://localhost:27017/todoList';

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
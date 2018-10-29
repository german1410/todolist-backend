'use strict';

let develpmentEnv = process.env.NODE_ENV === 'development';
let dbUrl = process.env.MONGO_DB_URL || 'mongodb://localhost:27017/todoList';

let config = {
  production: !develpmentEnv,
  development: develpmentEnv,
  service: {
    port: process.env.TODO_SRV_PORT || 8080
  },
  db: {
    url: dbUrl,
    autoCreate: develpmentEnv
  }

}

module.exports= config;
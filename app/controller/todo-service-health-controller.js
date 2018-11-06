'use strict';

const logger = require('../util/logger');
const {InternalServerError} = require('restify-errors');
const mongoose = require('mongoose');

/**
 * Controller used to handle health check on the service allowing to evaluate when it is requried to
 * restart the service.
 */
class TodoServiceHealthConstroller {

  /**
   * Verifies the service is able to handle more request. 
   * It basically check connection to the DB.
   * 
   * @param {*} request  Restify request object
   * @param {*} response Restify response object
   * @param {*} next     Next operation on Restify processing change
   */
  async checkHealth(request, response, next) {
    try {

      let state = mongoose.connection.readyState;
      logger.debug('TodoServiceHealthConstroller.checkHealth - Db readyState: %d', state);
      if (state === 0) {
        response.status(503);
        response.send({
          "db-connection": "disconnected"
        });
      } else {
        response.status(200);
        response.send({
          "db-connection": "ok"
        });
      }
      return next();
    } catch(error) {
      logger.error('TodoServiceHealthConstroller.checkHealth - Error trying on health check: %s', error);
      return next(new InternalServerError(`Error checking container health`));
    }
  }

  /**
   * Verifies the service is ready to start serving request.
   * Bascally it will wait until connection to DB is ok
   * 
   * @param {*} request  Restify request object
   * @param {*} response Restify response object
   * @param {*} next     Next operation on Restify processing change
   */
  async ready(request, response, next) {
    try {

      let state = mongoose.connection.readyState;
      logger.debug('TodoServiceHealthConstroller.ready - Db readyState: %d', state);
      if (state === 1) {
        response.status(200);
        response.send({
          "db-connection": "ok"
        });
      } else {
        response.status(503);
        response.send({
          "db-connection": "not-connected"
        });
       
      }
      return next();
    } catch(error) {
      logger.error('TodoServiceHealthConstroller.ready - Error tryingto check if service is ready: %s', error);
      return next(new InternalServerError(`Error checking container readiness`));
    }
  }
}

module.exports = TodoServiceHealthConstroller;
'use strict';

const _ = require('lodash');
const Joi = require('joi');
const {InternalServerError, BadRequestError, NotFoundError} = require('restify-errors');
const {listValidatorSchema, listIdValdatorSchema} = require('./validation');

const todoListDao = require('../db/todo-db-list');
const errors = require('../model/errors');
const logger = require('../util/logger');


async function createList(request, response, next) {

  let input = request.body;
  let validationResult = Joi.validate(input, listValidatorSchema);

  if (validationResult.error) {
    logger.debug('createList - validation error: %j', validationResult.error);
    return handleCreateValidationError(validationResult.error, next);
  } 
  
  let listName = input.name;
  logger.debug('createList - process request: %j', input);
  try {
    let list = await todoListDao.createList(listName);
    response.status(201);
    return handleSuccess(list, response, next, 'createList - New list created successfully');
  } catch (error) {
    logger.error('Error trying to create list: %s', error);
    return next(new InternalServerError(`Error trying to create list ${listName}`));
  }

}

async function getList(request, response, next) {

  let listId = request.params.listId;
  let validationResult = Joi.validate(listId, listIdValdatorSchema);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('getList - validation error: %j', error);
    let errorResponse = createInvalidListIdError(error);
    return next(new BadRequestError(errorResponse));
  } 
  
  logger.debug('getList - for list with id: %d', listId);
  try {
    let list = await todoListDao.findById(listId);
    if (list) {
      return handleSuccess(list, response, next, 'get - List found');
    } else {
      return next(new NotFoundError(errors.ListNotFound));
    }
    
  } catch (error) {
    logger.error('Error trying to retrieve list: %s', error);
    return next(new InternalServerError(`Error trying to create list with id ${listId}`));
  }

}

async function deleteList(request, response, next) {
  let listId = request.params.listId;
  let validationResult = Joi.validate(listId, listIdValdatorSchema);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('deleteList - validation error: %j', error);
    let errorResponse = createInvalidListIdError(error);
    return next(new BadRequestError(errorResponse));
  } 

  logger.debug('deleteList - for list with id: %d', listId);
  try {
    await todoListDao.deleteById(listId);
    response.status(204);
    return next();
  } catch (error) {
    logger.error('Error trying to delete list: %s', error);
    return next(new InternalServerError(`Error trying to delete list with id ${listId}`));
  }

}

function handleSuccess(list, response, next, message) {
    let responseBody = {
      id: list.id,
      name: list.name
    };
    logger.debug('%s: %j', message, responseBody);
    response.send(responseBody);
    return next();
}

function handleCreateValidationError(error, next) {
  let additionalInfo = { additionalInfo: error.details.message };
  let errorResponse;

  if (error.details[0] && error.details[0].type === 'any.unknown') {
    errorResponse = _.assign({}, errors.IdNotAcceptable, additionalInfo);
  } else {
    errorResponse = _.assign({}, errors.InvalidListName, additionalInfo);
  }
  return next(new BadRequestError(errorResponse));
}

function createInvalidListIdError(error) {
  let additionalInfo = { additionalInfo: error.details.message };
  let  errorResponse = _.assign({}, errors.IdNotAcceptable, additionalInfo);
  return new BadRequestError(errorResponse);
}

class TodoListConstroller {}
TodoListConstroller.prototype.createList = createList;
TodoListConstroller.prototype.getList = getList;
TodoListConstroller.prototype.deleteList = deleteList;

module.exports = TodoListConstroller;
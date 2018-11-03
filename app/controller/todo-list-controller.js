'use strict';

const Joi = require('joi');
const {InternalServerError, BadRequestError, NotFoundError} = require('restify-errors');
const {listValidator, listIdValdator} = require('./validation');

const {todoListDao} = require('../db/todo-db-list');
const {todoEntryDao} = require('../db/todo-db-entry');
const errors = require('../model/errors');
const {logger} = require('../util/logger');


async function createList(request, response, next) {

  let input = request.body;
  let validationResult = Joi.validate(input, listValidator);

  if (validationResult.error) {
    logger.debug('createList - validation error: %j', validationResult.error);
    return handleCreateValidationError(validationResult.error, next);
  } 
  
  let listName = input.name;
  logger.debug('createList - process request: %j', input);
  try {
    let {list} = await todoListDao.createList(listName);
    response.status(201);
    return handleSuccess(list, response, next, 'createList - New list created successfully');
  } catch (error) {
    logger.error('createList - Error trying to create list: %s', error);
    return next(new InternalServerError(`Error trying to create list ${listName}`));
  }

}

async function getList(request, response, next) {

  let listId = request.params.listId;
  let validationResult = Joi.validate(listId, listIdValdator);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('getList - validation error: %j', error);
    return next(createInvalidListIdError(error));
  } 
  
  logger.debug('getList - for list with id: %d', listId);
  try {
    let list = await todoListDao.findById(listId);

    if (!list) {
      logger.debug('getList - No list found with id: %d', listId);
      return next(new NotFoundError(errors.ListNotFound.toObject()));
    } 
    
    return handleSuccess(list, response, next, 'get - List found');
  } catch (error) {
    logger.error('getList - Error trying to retrieve list: %s', error);
    return next(new InternalServerError(`Error trying to create list with id ${listId}`));
  }

}

async function deleteList(request, response, next) {
  let listId = request.params.listId;
  let validationResult = Joi.validate(listId, listIdValdator);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('deleteList - list id validation error: %j', error);
    return next(createInvalidListIdError(error));
  } 

  logger.debug('deleteList - trying to delete list with id: %d', listId);
  try {

    let list = await todoListDao.findById(listId);
    
    if (!list) {
      logger.debug('deleteList - No list found with id: %d', listId);
      return next(new NotFoundError(errors.ListNotFound.toObject()));
    } 

    await todoEntryDao.deleteListTodos(list);
    await todoListDao.deleteById(listId);
    logger.debug('deleteList - list deleted with id: %d', listId);
    response.status(204);
    response.send();
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
  let errorResponse;

  if (error.details[0] && error.details[0].type === 'any.unknown') {
    errorResponse = errors.IdNotAcceptable;
  } else {
    errorResponse = errors.InvalidListName;
  }
  errorResponse = errorResponse.withAdditionalInfo(error.details.message);
  return next(new BadRequestError(errorResponse.toObject()));
}

function createInvalidListIdError(error) {
  let errorResponse = errors.IdNotAcceptable.withAdditionalInfo(error.details.message);
  return new BadRequestError(errorResponse.toObject());
}

function TodoListConstroller () {}
TodoListConstroller.prototype.createList = createList;
TodoListConstroller.prototype.getList = getList;
TodoListConstroller.prototype.deleteList = deleteList;

module.exports = TodoListConstroller;
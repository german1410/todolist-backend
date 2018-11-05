'use strict';

const _ = require('lodash');
const Joi = require('joi');
const {InternalServerError, BadRequestError, NotFoundError} = require('restify-errors');
const {listValidator, listIdValdator} = require('./validation');

const todoListDao = require('../db/todo-db-list');
const errors = require('../model/errors');
const logger = require('../util/logger');

/**
 * Handler used for creation of new ToDo lists
 * @param {*} request  Restify request object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
async function createList(request, response, next) {

  // First verify the input, then perform the operation
  let input = request.body;
  try {
    let validationResult = Joi.validate(input, listValidator);

    if (validationResult.error) {
      logger.debug('TodoListConstroller.createList - validation error: %j', validationResult.error);
      return handleCreateValidationError(validationResult.error, next);
    } 
    
    // Only use what is relevant
    let listName = input.name;
    logger.debug('TodoListConstroller.createList - process request: %j', input);
  
    // Create the new list and return only specific information
    let list = await todoListDao.createList(listName);
    response.status(201);
    return handleSuccess(list, response, next, 'TodoListConstroller.createList - New list created successfully');
  } catch (error) {
    logger.error('TodoListConstroller.createList - Error trying to create list: %s. Input: %j', error, input);
    return next(new InternalServerError('Error trying to create list'));
  }

}

/**
 * Handler used to retrive metadata for an specific list
 * @param {*} request  Restify request object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
async function getList(request, response, next) {

  // Validate list id format
  let listId = request.params.listId;
  let validationResult = Joi.validate(listId, listIdValdator);

  try {
    if (validationResult.error) {
      return next(createInvalidListIdError('getList', validationResult.error));
    } 
    
    // Search for the list and returned. If list is not found, return an appropriate error
    logger.debug('TodoListConstroller.getList - for list with id: %d', listId);
    
    let list = await todoListDao.findListById(listId);

    if (_.isNil(list)) {
      return next(createListNotFoundError('getList', listId));
    }
    
    // Format response with the list
    return handleSuccess(list, response, next, 'TodoListConstroller.getList - List found');
  } catch (error) {
    logger.error('TodoListConstroller.getList - Error trying to retrieve list with id %d: %s', listId, error);
    return next(new InternalServerError(`Error trying to create list with id ${listId}`));
  }

}

/**
 * Handler used to delete ToDo existing list 
 * @param {*} request  Restify request object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
async function deleteList(request, response, next) {

  // Verify the list if is valid
  let listId = request.params.listId;
  try {
    let validationResult = Joi.validate(listId, listIdValdator);

    if (validationResult.error) {
      return next(createInvalidListIdError('deleteList', validationResult.error));
    } 

    // Check if list exist before deleting
    logger.debug('TodoListConstroller.deleteList - trying to delete list with id: %d', listId);
  
    let list = await todoListDao.findListById(listId);
    
    if (_.isNil(list)) {
      return next(createListNotFoundError('deleteList', listId));
    } 

    // Delete the list and finish
    await todoListDao.deleteListById(listId);
    logger.debug('TodoListConstroller.deleteList - list deleted with id: %d', listId);
    response.status(204);
    response.send();
    return next();
  } catch (error) {
    logger.error('TodoListConstroller.deleteList Error trying to delete list with id %d: %s', listId, error);
    return next(new InternalServerError(`Error trying to delete list with id ${listId}`));
  }

}

/**
 * Handle successful operations on a list which returns the list metadata on the response.
 * Only metadata will be exposed on the response and then next operation on Restify chain
 * is called
 * @param {*} list     The list to be included on the response
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 * @param {*} message  Used for logging
 */
function handleSuccess(list, response, next, message) {
    let responseBody = {
      id: list.id,
      name: list.name
    };
    logger.debug('%s: %j', message, responseBody);
    response.send(responseBody);
    return next();
}

/**
 * Handle errors on input for list creation.
 * This will inject error details, based on error information, and then 
 * call the next elemant in restify chain
 * @param {*} error to process 
 * @param {*} next  Next operation on Restify processing change
 */
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

/**
 * Create an appropriated error to be sent on the response. Used to inform the user
 * that the provided list id format is not compliant with the allowed format
 * @param {*} operation Operation executed, used for logging
 * @param {*} error     Validation error
 */
function createInvalidListIdError(operation, error) {
  logger.debug('TodoListConstroller.%s - list id validation error: %j', operation, error);
  let errorResponse = errors.IdNotAcceptable.withAdditionalInfo(error.details.message);
  return new BadRequestError(errorResponse.toObject());
}

/**
 * Create an appropriated error to be sent on the response. Used to inform the user
 * that the requested list id on which the operation is performed, no longer exists
 * @param {*} operation Operation executed, used for logging
 * @param {*} error     Validation error
 */
function createListNotFoundError(operation, listId) {
  logger.debug('TodoListConstroller.%s - No list found with id: %d', operation, listId);
  let notFoundError = errors.ListNotFound.withAdditionalInfo(`List id ${listId}`)
                                             .toObject();
  return new NotFoundError(notFoundError);
}

/**
 * Constroller used to handle operation specific to the list creation and deletion, as well
 * as list metadata. 
 * @class
 */
function TodoListConstroller () {}
TodoListConstroller.prototype.createList = createList;
TodoListConstroller.prototype.getList = getList;
TodoListConstroller.prototype.deleteList = deleteList;

module.exports = TodoListConstroller;
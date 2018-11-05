'use strict';

const _ = require('lodash');
const Joi = require('joi');
const {InternalServerError, BadRequestError, NotFoundError} = require('restify-errors');

const logger = require('../util/logger');

const config = require('../config/todo-service-config');
const todoListDao = require('../db/todo-db-list');
const modelConstants = require('../model/model-constants');
const errors = require('../model/errors');

const validators = require('./validation');

/**
 * Handler used for creation of ToDo on an existing ToDo list.
 * The handler will check for allowed information used to create the todo,
 * salitize that information and created the ToDo on the list.
 * If the list does not exist, an error is returned.
 * 
 * @async
 * @function
 * @param {*} request  Restify request object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
async function createTodo(request, response, next) {
  try {
    // Validate input first and fail fast
    let validationResult = validateListId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    }
    
    let input = request.body;
    validationResult = Joi.validate(input, validators.todoValidator);

    if (validationResult.error) {
      let error = validationResult.error;
      logger.debug('TodoEntryConstroller.createTodo - Todo validation error: %j', error);
      return handleCreateValidationError(error, next);
    } 
    
    let listId = request.params.listId;
    logger.debug('TodoEntryConstroller.createTodo - process todo for list %d request: %j', listId, input);

    // Sanitize input. Get only information that can be used to create the ToDo
    // everything else is discarded
    let todoToInsert = {
      description: input.description,
    };

    if (!_.isNil(input.due_date)) {
      todoToInsert.due_date = new Date(input.due_date);
    }
    let todo = await todoListDao.createTodo(listId, todoToInsert);

    // Fail is list does not exist
    if (todo.listNotFound) {
      return next(createListNotFoundError('createTodo', listId));
    } 

    // Process list from Db and only return information useful for the user
    return handleCreationSuccess(listId, todo.todo, response, next);
  } catch (error) {
    logger.error('TodoEntryConstroller.createTodo - Error trying to create todo: %s', error);
    return next(new InternalServerError(`Error trying to create todo for list ${request.params.listId}`));
  }

}

/**
 * Handler used to remove an existing ToDo from a list.
 * This handler will validate input format and try to delete the
 * ToDo from the list based on the ids. If either the list or ToDo
 * do not exist, an error is returned with the appropriated information.
 *  
 * @async
 * @function
 * @param {*} request  Restify request object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
async function deleteTodo(request, response, next) {
  try {
    // Verify input and fail fast
    let validationResult = validateListId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    }

    validationResult = validateTodoId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    } 
    let listId = request.params.listId;
    let todoId = request.params.todoId;

  
    // Delete the ToDo
    let operatonResult = await todoListDao.deleteTodo(listId, todoId);

    // Handle expected error cases
    if (operatonResult.listNotFound) {
      return next(createListNotFoundError('deleteTodo', listId));
    }

    if (operatonResult.todoNotFound) {
      return next(createTodoNotFoundError('deleteTodo', listId, todoId));
    }

    // List was succesfully deleted
    logger.debug('TodoEntryConstroller.deleteTodo - ToDo successfully deleted from list with id %d. ToDo id: %d', listId, todoId);
    response.status(204);
    response.send();

  } catch (error) {
    logger.error('TodoEntryConstroller.deleteTodo - Error trying to delete todo: %s', error);
    return next(new InternalServerError(`Error trying to delete todo for list ${request.params.listId}, todo id=${request.params.todoId}`));
  }

  return next();
}

/**
 * Handler used to get an specific ToDo from a list.
 * This handler will find the list and retrieve the ToDo with the 
 * provided if. If either the list or ToDo
 * do not exist, an error is returned with the appropriated information.
 * 
 * @param {*} request  Restify request object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
async function getTodo(request, response, next) {
  try {

    // Verify input and fail fast
    let validationResult = validateListId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    }

    validationResult = validateTodoId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    } 

    let listId = request.params.listId;
    let todoId = request.params.todoId;

    let {listFound, todo} = await todoListDao.findTodoById(listId, todoId);

    if (!listFound) {
      return next(createListNotFoundError('getTodo', listId));
    }

    if (_.isNil(todo)) {
      return next(createTodoNotFoundError('getTodo', listId, todoId));
    } 

    let responseBody = createTodoResponse(todo);
    logger.debug('TodoEntryConstroller.getTodo - ToDo found on list with id %d. ToDo %j', listId, todo);
    response.status(200);
    response.send(responseBody);
  } catch (error) {
    logger.error('TodoEntryConstroller.getTodo - Error trying to retrieve todo: %s', error);
    return next(new InternalServerError(`Error trying to update todo for list ${request.params.listId}, todo id=${request.params.todoId}`));
  }

  return next();
}

/**
 * Handler used to performa partial updated on a particular ToDo.
 * Updated cna be applied to:
 *  - Description
 *  - Due date
 *  - State
 * 
 * If either the list or ToDo do not exist, an error is returned with the appropriated information.
 * 
 * @param {*} request  Restify request object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
async function updateTodo(request, response, next) {

  try {
    // Validate and fail fast
    let validationResult = validateListId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    }

    validationResult = validateTodoId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    } 

    // Verify incomming information used for partial update
    let input = request.body;
    validationResult = Joi.validate(input, validators.todoPartialUpdateValidator);

    if (validationResult.error) {
      let error = validationResult.error;
      logger.debug('TodoEntryConstroller.updateTodo - Input for update invalid: %j', error);
      let errorResponse = errors.IdNotAcceptable.withAdditionalInfo(error.details.message)
                                                .toObject();
      return next(new BadRequestError(errorResponse));
    }

    let listId = request.params.listId;
    let todoId = request.params.todoId;

    logger.debug('TodoEntryConstroller.updatetTodo - Update ToDo on list with id %d. ToDo id: %d', listId, todoId);
    let partialUpdate = sanitizeTodoUpdate(input);

    // Apply update and handle errors
    let operatonResult = await todoListDao.updateTodo(listId, todoId, partialUpdate);
    if (operatonResult.listNotFound) {
      return next(createListNotFoundError('deleteTodo', listId));
    }

    if (operatonResult.todoNotFound) {
      return next(createTodoNotFoundError('deleteTodo', listId, todoId));
    }

    // Return the fresh copy after the update
    // This shall include new last update date and all changes applied to the document
    let refreshedCopy = operatonResult.todo;
    logger.debug('TodoEntryConstroller.Return updated ToDo: %j', refreshedCopy);
    let responseBody = createTodoResponse(refreshedCopy);
    response.status(200);
    response.send(responseBody);
  } catch (error) {
    logger.error('TodoEntryConstroller.updatetTodo - Error trying to update todo: %s', error);
    return next(new InternalServerError(`Error trying to update todo for list ${request.params.listId}, todo id=${request.params.todoId}`));
  }

  return next();
}

/**
 * Handler used to retriever a subset of the ToDo included on a list
 * The result can be manipulated using the following parameters:
 *   - Index:   Indicates the offset from which ToDos are returned after they are sorted
 *   - Limit:   Maximum numnber of todos to return
 *   - orderBy: Specify the field used to sort the ToDo. Options are:
 *        + creation_date: Used by default
 *        + last_update_date
 *   - orderDirection: Specify the direction for sorting, either ascedant (asc) or descendant (desc).
 *                     Default is descendant (desc)
 * 
 * @param {*} request  Restify request object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
async function getTodos(request, response, next) {
  let validationResult = validateListId(request); 
  if (validationResult.error) {
    return next(validationResult.error);
  }

  let listId = request.params.listId;

  try {
    // parse resul set management paramters provided on the query
    let { resultSetParameters, paramsError } = extractResultSetParameters(request.query);

    if (paramsError) {
      logger.error('TodoEntryConstroller.getTodos - Error on the provided parameters, trying to get ToDos from list with id %d: %j', 
                   listId, paramsError);
      return next(paramsError);
    }


    // Extract result set management parameters
    let index = resultSetParameters.index;
    let limit = resultSetParameters.limit;
    let orderBy = resultSetParameters.orderBy;
    let orderDirection = resultSetParameters.orderDirection || modelConstants.orderDirection.desc;
    logger.debug('TodoEntryConstroller.getTodos - Retrieve Todos from list with id %d, index: %d, limit: %d, orderBy: %s, orderDirection: %s', 
                 listId, index, limit, orderBy, orderDirection);
    
    // Get the ToDos
    let todoList = await todoListDao.getTodos(listId, index, limit, orderBy, orderDirection);

    if (_.isNil(todoList)) {
      logger.debug('TodoEntryConstroller.getTodos - No list found with id: %d', listId);
      return next(createListNotFoundError(listId));
    }

    // Generate a response with the ToDos fount. 
    // Information about the result set is also included
    logger.debug('TodoEntryConstroller.getTodos - Generate output with Todos from list with id %d.', listId);
    response.status(200);
    response.send(createTodoListResponse(todoList));

  } catch (error) {
    logger.error('TodoEntryConstroller.getTodos - Error trying to retrieve ToDos: %s', error);
    return next(new InternalServerError(`Error trying to retrieve ToDos from list ${listId}`,));
  }

  return next();
}

/**
 * Verifies that request has a valid list id
 * @param {*} request Restify request object
 * @returns {object} An empty object if there are no error, or the vaidation error
 *                   under key 'error'
 */
function validateListId(request) {
  let listId = request.params.listId;
  let validationResult = Joi.validate(listId, validators.listIdValdator);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('validateList - list id validation error: %j', error);
    let errorResponse = errors.IdNotAcceptable.withAdditionalInfo(error.details.message)
                                              .toObject();
    return {
      error: new BadRequestError(errorResponse) 
    };
  }

  return {};
}

/**
 * Verifies that request has a valid ToDo id
 * @param {*} request An empty object if there are no error, or the vaidation error
 *                    under key 'error'
 */
function validateTodoId(request) {
  let todoId = request.params.todoId;
  let validationResult = Joi.validate(todoId, validators.todoIdValdator);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('validateTodoId - todo id validation error: %j', error);
    let errorResponse = errors.IdNotAcceptable.withAdditionalInfo(error.details.message)
                                              .toObject();
    return {
      error: new BadRequestError(errorResponse)
    };
  }

  return {};
}

/**
 * Create a restify error with extra message description to indicate
 * the requested list does not exist
 * @param {string} operation  - Operation were the list was not found
 * @param {number} listId     - List id requested but not found
 */
function createListNotFoundError(operation, listId) {
  logger.debug('TodoEntryConstroller.%s - No list found with id: %d', operation, listId);
  let notFoundError = errors.ListNotFound.withAdditionalInfo(`List id ${listId}`)
                                             .toObject();
  return new NotFoundError(notFoundError);
}

/**
 * Create a restify error with extra message description to indicate
 * the requested list or todo does not exist
 * @param {string} operation  - Operation were the list was not found
 * @param {number} listId     - List id requested
 * @param {number} todoId     - ToDo id quested but not found
 */
function createTodoNotFoundError(operation, listId, todoId) {
  logger.debug('TodoEntryConstroller.%s - No Todo with id %d found on list with id: %d', operation, todoId, listId);
  let notFoundError = errors.TodoNotFound.withAdditionalInfo(`No ToDo with id ${todoId} on list with id ${listId}`)
                                          .toObject();
  return new NotFoundError(notFoundError);
}

/**
 * Create a response to inicate the new ToDo was successfuly created into the target list.
 * Todos are processed and only the allowed information is exposed on the response.
 * 
 * @param {*} listId on which ToDo was created
 * @param {*} todo   The stored ToDo object
 * @param {*} response Restify response object
 * @param {*} next     Next operation on Restify processing change
 */
function handleCreationSuccess(listId, todo, response, next) {
  let responseBody = createTodoResponse(todo);

  logger.debug('TodoEntryConstroller.createTodo - New todo created successfully for list %d: %j', listId, responseBody);
  response.status(201);
  response.send(responseBody);
  return next();
}

/**
 * Create a Restify error and call next in order to continue with resity chain.
 * The error indicates one of the paramters is not correct.
 * @param {*} error Validation error 
 * @param {*} next  Next operation on Restify processing change
 */
function handleCreateValidationError(error, next) {
  let errorResponse;

  if (error.details[0] && error.details[0].type === 'any.unknown') {
    errorResponse = errors.IdNotAcceptable;
  } else {
    errorResponse = errors.InvalidTodoEntry;
  }
  errorResponse = errorResponse.withAdditionalInfo(error.details.message);
  return next(new BadRequestError(errorResponse.toObject()));
}

/**
 * Extracts only the informaiton that can be exposed outside
 * @param {object} todo for which output obejct is created
 */
function createTodoResponse(todo) {

  // Base object with required values
  let responseBody = {
    id: todo.id,
    description: todo.description,
    state: todo.state,
    creation_date: todo.creation_date.getTime(),
    last_update_date: todo.last_update_date.getTime()
  };

  // optional values
  if (!_.isNil(todo.due_date)) {
    responseBody.due_date = todo.due_date.getTime();
  }

  return responseBody;
}

/**
 * ToDo filed that can be modified
 */
const allowedUpateFields = ['description', 'state' ,'due_date']; 

/**
 * Process update input and only extract values that are allowed as input for partial updated
 * @param {object} input to process
 * @returns {object} A new object which only contains allowed data
 */
function sanitizeTodoUpdate(input) {
  let partialUpdate = {};
  // Snitize and drop anything that is not required
  let keys = _.keys(input);
  _.forEach(keys, key => {
    if (_.includes(allowedUpateFields, key)) {
      partialUpdate[key] = input[key];
    }
  });

  // Special conversion
  // Create a date from the due date time stamp
  if (!_.isNil(partialUpdate.due_date)) {
    partialUpdate.due_date = new Date(partialUpdate.due_date);
  }

  return partialUpdate;
}

/**
 * Extract result set management parameters
 * @param {object} queryParameters to process
 * @returns {object} allowed query parameters
 */
function extractResultSetParameters(queryParameters) {
  let validationResult = Joi.validate(queryParameters, validators.resultSetQueryValidatior);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('TodoEntryConstroller.extractResultSetParameters - Invalid parameters: %j', error);
    let errorResponse = errors.InvalidPaginationParams.withAdditionalInfo(error.details)
                                                     .toObject();
    return { paramsError: new BadRequestError(errorResponse) };
  }
   
  return {
    resultSetParameters: {
      after: queryParameters.after,
      index: _.parseInt(queryParameters.index) || 0,
      limit: _.parseInt(queryParameters.limit) || config.search.default_imit,
      orderBy: queryParameters.orderBy,
      orderDirection: queryParameters.orderDirection
    }
  };
}

/**
 * Creates a valida object as output for list of todos from a list.
 * Additional pagination information is inyected.
 * @param {object} todoList with all the ToDos to include on the response
 * @returns {object} The list of Todos wrapped inside an object that also hold pagination information.
 */
function createTodoListResponse(todoList) {

  // No ToDos on the list
  if (_.isEmpty(todoList)) {
    logger.debug('TodoEntryConstroller.createTodoListResponse: Empty ToDo result set');
    return {
      size:  0,
      todos: []
    };
  }

  // Wrap ToDos with information about the current result set
  let size = todoList.length;
  logger.debug('TodoEntryConstroller.createTodoListResponse: Process ToDo result set with %d ToDos', size);
  let result = {
    first: todoList[0].id,
    last:  todoList[size-1].id,
    size:  size,
    todos: []
  };

  // Sanitize ToDos and include them on the response
  _.forEach(todoList, todo => {
    result.todos.push(createTodoResponse(todo));
  });

  return result;
}

function TodoEntryConstroller() {}
TodoEntryConstroller.prototype.createTodo = createTodo;
TodoEntryConstroller.prototype.deleteTodo = deleteTodo;
TodoEntryConstroller.prototype.getTodo    = getTodo;
TodoEntryConstroller.prototype.updateTodo = updateTodo;
TodoEntryConstroller.prototype.getTodos   = getTodos;

module.exports = TodoEntryConstroller;
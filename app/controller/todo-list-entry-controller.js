'use strict';

const _ = require('lodash');
const Joi = require('joi');
const {InternalServerError, BadRequestError, NotFoundError} = require('restify-errors');
const validators = require('./validation');

const config = require('../config/todo-service-config');
const {todoListDao} = require('../db/todo-db-list');
const {todoEntryDao} = require('../db/todo-db-entry');
const dbConstants = require('../db/db-constants');
const errors = require('../model/errors');
const logger = require('../util/logger');

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

async function loadList(listId) {
  logger.debug('loadList - Trying to load list with id: %d', listId);
  try {
    let list = await todoListDao.findById(listId);

      if (!list) {
        logger.debug('loadList - No list found with id: %d', listId);
        let notFoundError = errors.ListNotFound.withAdditionalInfo(`List id ${listId}`)
                                               .toObject();
        return { 
          error: new NotFoundError(notFoundError)
        };
      } 

      return { list: list };
    } catch (error) {
      logger.error('loadList - Error trying to create todo: %s', error);
      return {
        error: new InternalServerError(`Error trying to create todo for list ${listId}`)
      };
  }  
}

async function loadTodo(listId, todoId) {
  let {list, error} = await loadList(listId);

  if (error) {
    logger.error('loadTodo - Error trying to find target ToDo with id %d on list %d: %j', listId, error);
    return { error: error };
  }

  let todo = await todoEntryDao.findById(list, todoId);

  if (!todo) {
    let errorResponse = errors.TodoNotFound.withAdditionalInfo(`No ToDo with id ${todoId} on list with id ${listId}`)
                                           .toObject();
    return {
      error: new NotFoundError(errorResponse)
    };
  }

  return { todo: todo };
}

async function createTodo(request, response, next) {

  let validationResult = validateListId(request); 
  if (validationResult.error) {
    return next(validationResult.error);
  }
  
  let input = request.body;
  validationResult = Joi.validate(input, validators.todoValidator);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('createTodo - Todo validation error: %j', error);
    return handleCreateValidationError(error, next);
  } 
  
  let listId = request.params.listId;
  logger.debug('createTodo - process todo for list %d request: %j', listId, input);
  try {
    let {list, error} = await loadList(listId);

    if (error) {
      logger.error('createTodo - Error trying to create ToDo on list %d: %j', listId, error);
      return next(error);
    }

    let todoToInsert = {
      description: input.description,
      dueDate: input.dueDate
    };
    let todo = await todoEntryDao.createTodo(list, todoToInsert);
    return handleCreationSuccess(listId, todo, response, next);
  } catch (error) {
    logger.error('createTodo - Error trying to create todo: %s', error);
    return next(new InternalServerError(`Error trying to create todo for list ${listId}`));
  }

}

async function deleteTodo(request, response, next) {

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

  try {
    let {list, error} = await loadList(listId);

    if (error) {
      logger.error('deleteTodo - Error trying to find target ToDo list %d: %j', listId, error);
      return next(error);
    }

    await todoEntryDao.deleteTodo(list, todoId);
    logger.debug('deleteTodo - ToDo successfully deleted from list with id %d. ToDo id: %d', listId, todoId);
    response.status(204);
    response.send();

  } catch (error) {
    logger.error('deleteTodo - Error trying to delete todo: %s', error);
    return next(new InternalServerError(`Error trying to delete todo for list ${listId}, todo id=${todoId}`));
  }

  return next();
}

async function getTodo(request, response, next) {
  try {
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

    let {todo, error} = await loadTodo(listId, todoId);

    if (error) {
      logger.error('getTodo - Error trying to find target ToDo with id %d on list %d: %j', 
                   todoId, listId, error);
      return next(error);
    }

    let responseBody = createTodoResponse(todo);
    logger.debug('getTodo - ToDo found on list with id %d. ToDo %j', listId, todo);
    response.status(200);
    response.send(responseBody);
  } catch (error) {
    logger.error('getTodo - Error trying to retrieve todo: %s', error);
    return next(new InternalServerError(`Error trying to update todo for list ${request.params.listId}, todo id=${request.params.todoId}`));
  }

  return next();
}

async function updateTodo(request, response, next) {

  try {
    let validationResult = validateListId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    }

    validationResult = validateTodoId(request); 
    if (validationResult.error) {
      return next(validationResult.error);
    } 

    let input = request.body;
    validationResult = Joi.validate(input, validators.todoPartialUpdateValidator);

    if (validationResult.error) {
      let error = validationResult.error;
      logger.debug('updateTodo - Input for update invalid: %j', error);
      let errorResponse = errors.IdNotAcceptable.withAdditionalInfo(error.details.message)
                                                .toObject();
      return next(new BadRequestError(errorResponse));
    }

    let listId = request.params.listId;
    let todoId = request.params.todoId;

    let {list, error} = await loadList(listId);

    if (error) {
      logger.error('updatetTodo - Error trying to find target ToDo list with id %d: %j', 
                   listId, error);
      return next(error);
    }

    logger.debug('updatetTodo - ToDo found on list with id %d. ToDo id: %d. Proceed to update', listId, todoId);
    let partialUpdate = sanitizeTodoUpdate(input);
    let refreshedCopy = await todoEntryDao.update(list, todoId, partialUpdate);
    
    logger.debug('Return updated ToDo: %j', refreshedCopy);
    let responseBody = createTodoResponse(refreshedCopy);
    response.status(200);
    response.send(responseBody);
  } catch (error) {
    logger.error('updatetTodo - Error trying to update todo: %s', error);
    return next(new InternalServerError(`Error trying to update todo for list ${request.params.listId}, todo id=${request.params.todoId}`));
  }

  return next();
}

async function getTodos(request, response, next) {
  let validationResult = validateListId(request); 
  if (validationResult.error) {
    return next(validationResult.error);
  }

  let listId = request.params.listId;

  try {
    let { resultSetParameters, paramsError } = extractResultSetParameters(request.query);

    if (paramsError) {
      logger.error('getTodos - Error on the provided parameters, trying to get ToDos from list with id %d: %j', 
                   listId, paramsError);
      return next(paramsError);
    }

    let {list, error} = await loadList(listId);

    if (error) {
      logger.error('getTodos - Error trying to find target ToDo list %d: %j', listId, error);
      return next(error);
    }

    let index = resultSetParameters.index;
    let limit = resultSetParameters.limit;
    let orderBy = resultSetParameters.orderBy;
    let orderDirection = resultSetParameters.orderDirection 
                                ? dbConstants.sortDirection[resultSetParameters.orderDirection]
                                : dbConstants.sortDirection.desc;
    logger.debug('getTodos - Retrieve Todos from list with id %d, index: %d, limit: %d, orderBy: %s, orderDirection: %s', 
                 listId, index, limit, orderBy, orderDirection);
    let todoList = await todoEntryDao.getTodos(list, index, limit, orderBy, orderDirection);
    logger.debug('getTodos - Generate output with Todos from list with id %d.', listId);
    response.status(200);
    response.send(createTodoListResponse(todoList));

  } catch (error) {
    logger.error('getTodos - Error trying to retrieve ToDos: %s', error);
    return next(new InternalServerError(`Error trying to retrieve ToDos from list ${listId}`,));
  }

  return next();
}

function handleCreationSuccess(listId, todo, response, next) {
  let responseBody = createTodoResponse(todo);

  logger.debug('createTodo - New todo created successfully for list %d: %j', listId, responseBody);
  response.status(201);
  response.send(responseBody);
  return next();
}

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

function createTodoResponse(todo) {
  let responseBody = {
    id: todo.id,
    description: todo.description,
    state: todo.state,
    creation_date: todo.creation_date.getTime(),
    last_update_date: todo.last_update_date.getTime()
  };

  if (todo.dueDate) {
    responseBody.due_date = todo.due_date.getTime();
  }

  return responseBody;
}

const allowedUpateFields = ['description', 'state' ,'due_date']; 

function sanitizeTodoUpdate(input) {
  let partialUpdate = {};
  // Snitize and drop anything that is not required
  let keys = _.keys(input);
  _.forEach(keys, key => {
    if (_.includes(allowedUpateFields, key)) {
      partialUpdate[key] = input[key];
    }
  });

  return partialUpdate;
}


function extractResultSetParameters(queryParameters) {
  let validationResult = Joi.validate(queryParameters, validators.resultSetQueryValidatior);

  if (validationResult.error) {
    let error = validationResult.error;
    logger.debug('extractResultSetParameters - Invalid parameters: %j', error);
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

function createTodoListResponse(todoList) {
  if (_.isEmpty(todoList)) {
    logger.debug('Empty ToDo result set');
    return {
      size:  0,
      todos: []
    };
  }


  let size = todoList.length;
  logger.debug('Process ToDo result set with %d ToDos', size);
  let result = {
    first: todoList[0].id,
    last:  todoList[size-1].id,
    size:  size,
    todos: []
  };

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
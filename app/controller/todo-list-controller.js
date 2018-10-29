'use strict';

const _ = require('lodash');
const Joi = require('joi');
const {InternalServerError, BadRequestError} = require('restify-errors');

const TodoListDao = require('../db/todo-db-list');
const errors = require('../model/errors');
const logger = require('../util/logger');

const valdatorSchema = Joi.object()
                          .keys({
                            id: Joi.any().forbidden(),
                            name: Joi.string().min(1, 'utf8').max(400, 'utf8').required()
                          })
                          .required();


async function createList(request, response, next) {

  let input = request.body;
  let validationResult = Joi.validate(input, valdatorSchema);

  if (validationResult.error) {
    logger.debug('createList - validation error: %s', validationResult.error);
    return handleValidationError(validationResult.error, next);
  } else {
    let listName = input.name;
    logger.debug('createList - process request: %s', input);
    try {
      let list = await TodoListDao.createList(listName);
      return handleSuccess(list, response, next);
    } catch (error) {
      logger.error('Error trying to create list: %s', error);
      return next(new InternalServerError(`Error trying to create list ${listName}`));
    }
  }
}

function handleSuccess(list, response, next) {
    let responseBody = {
      id: list._id,
      name: list.name
    };
    logger.debug('createList - New list created successfully: %s', responseBody);
    response.send(responseBody);
    return next();
}

function handleValidationError(error, next) {
  let additionalInfo = { additionalInfo: error.details.message};
  let errorResponse;

  if (error.details[0] && error.details[0].type === 'any.unknown') {
    errorResponse = _.assign({}, errors.IdNotAcceptable, additionalInfo);
  } else {
    errorResponse = _.assign({}, errors.InvalidListName, additionalInfo);
  }
  return next(new BadRequestError(errorResponse));
}

module.exports = createList;
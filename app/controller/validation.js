'use strict';

const _ = require('lodash');
const Joi = require('joi');

const modelConstants = require('../model/model-constants');

const listValidator = Joi.object()
                          .keys({
                            id: Joi.any().forbidden(),
                            name: Joi.string().min(1, 'utf8').max(400, 'utf8').required()
                          })
                          .required();
                          
const listIdValdator = Joi.number().required();

const todoDescriptionValidator = Joi.string().min(1, 'utf8').max(2000, 'utf8');
const todoDueDateValidator = Joi.number().min(1).allow(null);

const todoValidator = Joi.object()
                              .keys({
                                id: Joi.any().forbidden(),
                                description: todoDescriptionValidator.required(),
                                due_date: todoDueDateValidator
                              })
                              .required();

const todoIdValdator = Joi.number().required();

const todoPartialUpdateValidator = Joi.object()
                                      .keys({
                                        id: Joi.any().forbidden(),
                                        description: todoDescriptionValidator,
                                        due_date: todoDueDateValidator,
                                        state: Joi.string().only(_.values(modelConstants.todoStates))
                                      })
                                      .or('description', 'due_date', 'state')
                                      .required();

const resultSetQueryValidatior = Joi.object()
                                        .keys({
                                          index: Joi.number().min(0),
                                          limit: Joi.number().min(1),
                                          orderBy: Joi.string().only(_.values(modelConstants.orderBy)),
                                          orderDirection: Joi.string().only(_.keys(modelConstants.orderDirection))
                                        })
                                        .with('orderDirection', ['orderBy']);

/**
 * Validators used to apply check on service request input
 * 
 * @property {object} listValidator               - Validates input data used to create new lists
 * @property {object} listIdValdator              - Validate format of list identifier used to reference a list on operations
 * @property {object} todoValidator               - Validates input data used to create new ToDos
 * @property {object} todoIdValdator              - Validate format of ToDo identifier used to reference a ToDo on operations
 * @property {object} todoPartialUpdateValidator  - Validates input data used to update existing ToDos
 * @property {object} resultSetQueryValidatior    - Validate parameters provided in order to get paginated results
 */
module.exports = {
  listValidator:              listValidator,
  listIdValdator:             listIdValdator,
  todoValidator:              todoValidator,
  todoIdValdator:             todoIdValdator,
  todoPartialUpdateValidator: todoPartialUpdateValidator,
  resultSetQueryValidatior:   resultSetQueryValidatior
};
'use strict';

const _ = require('lodash');
const Joi = require('joi');

// For simplicity use the same values form DB but when changes proably a map would be better
// to be able to modify the DB wihtout changing the service
const modelConstants = require('../model/model-constants');

const listValidator = Joi.object()
                          .keys({
                            id: Joi.any().forbidden(),
                            name: Joi.string().min(1, 'utf8').max(400, 'utf8').required()
                          })
                          .required();
                          
const listIdValdator = Joi.number().required();

const todoDescriptionValidator = Joi.string().min(1, 'utf8').max(2000, 'utf8');
const todoDueDateValidator = Joi.number().min(1);

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
                                      .or('description', 'dueDate', 'state')
                                      .required();

const resultSetQueryValidatior = Joi.object()
                                        .keys({
                                          index: Joi.number().min(0),
                                          limit: Joi.number().min(1),
                                          orderBy: Joi.string().only(_.values(modelConstants.sortBy)),
                                          orderDirection: Joi.string().only(_.keys(modelConstants.sortDirection))
                                        })
                                        .with('orderDirection', ['orderBy']);

module.exports.listValidator  = listValidator;
module.exports.listIdValdator = listIdValdator;
module.exports.todoValidator  = todoValidator;
module.exports.todoIdValdator = todoIdValdator;
module.exports.todoPartialUpdateValidator = todoPartialUpdateValidator;
module.exports.resultSetQueryValidatior = resultSetQueryValidatior;
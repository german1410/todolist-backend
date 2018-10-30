'use strict';

const Joi = require('joi');

const listValidatorSchema = Joi.object()
                          .keys({
                            id: Joi.any().forbidden(),
                            name: Joi.string().min(1, 'utf8').max(400, 'utf8').required()
                          })
                          .required();
                          
const listIdValdatorSchema = Joi.number().required();

const todoValidatorSchema = Joi.object()
                              .keys({
                                id: Joi.any().forbidden(),
                                description: Joi.string().min(1, 'utf8').max(2000, 'utf8').required(),
                                dueDate: Joi.number().min(1)
                              })
                              .required();


module.exports.listValidatorSchema = listValidatorSchema;
module.exports.listIdValdatorSchema = listIdValdatorSchema;
module.exports.todoValidatorSchema = todoValidatorSchema;
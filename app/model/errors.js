'use strict';

const _ = require('lodash');

/**
 * Object that represent error details for service error responses
 * 
 * @class
 */
class TodoError {

  /**
   * Createa a new error response object
   * @param {string} code     - Code associated with the error
   * @param {string} message  - Human readable message
   */
  constructor(code, message) {
    this.code = code;
    this.message = message;
  }

  /**
   * Creates a new TodoError instance based on current instance but with the provided object 
   * as additional info.
   * @param {*} additionalInfo Additional info for the error
   */
  withAdditionalInfo(additionalInfo) {
    let errorWithAdditionalInfo = new TodoError(this.code, this.message);
    errorWithAdditionalInfo.additionalInfo = additionalInfo;
    return errorWithAdditionalInfo;
  }

  /**
   * @returns {object} Creates a JSON object with error information
   */
  toObject() {
    return _.assign({}, this);
  }
}

/**
 * Service errors
 * @property {TodoError} IdNotAcceptable         - Indicates the provided id does not have a valid format
 * @property {TodoError} InvalidListName         - Indicates the list name was not compliant with name restriction on the service
 * @property {TodoError} ListNotFound            - Indicates the provided list id used for the operation does not corresponds to an exiting list
 * @property {TodoError} InvalidTodoEntry        - Indicates the provided ToDo data is not valid according to service restrictions
 * @property {TodoError} TodoNotFound            - Indicates the provided Todo id used for the operation does not corresponds to an exiting Todo on the target list
 * @property {TodoError} InvalidPaginationParams - Indicates input pagination parameters are not valid
 */
module.exports = {
  IdNotAcceptable:         new TodoError('IdNotAcceptable', 'Object id is not acceptable for the request'),
  InvalidListName:         new TodoError('InvalidListName', 'Invalid list name'),
  ListNotFound:            new TodoError('ListNotFound',     'No list found with the provided id'),
  InvalidTodoEntry:        new TodoError('InvalidTodoEntry', 'Provided Todo entry is not valid'),
  TodoNotFound:            new TodoError('ListNotFound',     'No ToDo found with the provided id on the list'),
  InvalidPaginationParams: new TodoError('InvalidPaginationParams',     'Provided pagination parameters are not valid'),
};
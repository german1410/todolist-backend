'use strict';

const _ = require('lodash');

class TodoError {
  constructor(code, message) {
    this.code = code;
    this.message = message;
  }

  withAdditionalInfo(additionalInfo) {
    let errorWithAdditionalInfo = new TodoError(this.code, this.message);
    errorWithAdditionalInfo.additionalInfo = additionalInfo;
    return errorWithAdditionalInfo;
  }

  toObject() {
    return _.assign({}, this);
  }
}

module.exports = {
  IdNotAcceptable:         new TodoError('IdNotAcceptable', 'Object id is not acceptable for the request'),
  InvalidListName:         new TodoError('InvalidListName', 'Invalid list name'),
  ListNotFound:            new TodoError('ListNotFound',     'No list found with the provided id'),
  InvalidTodoEntry:        new TodoError('InvalidTodoEntry', 'Provided Todo entry is not valid'),
  TodoNotFound:            new TodoError('ListNotFound',     'No ToDo found with the provided id on the list'),
  InvalidPaginationParams: new TodoError('InvalidPaginationParams',     'Provided pagination parameters are not valid'),
};
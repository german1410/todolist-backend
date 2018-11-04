'use strict';

// Reuse constants from the model
const modelConstant = require('../model/model-constants');

const counterCollection = 'todo_list_counters';

const sortDirection = {
  desc: -1,
  asc: 1
};

module.exports.todoStates = modelConstant.todoStates;
module.exports.counterCollection = counterCollection;
module.exports.sortBy = modelConstant.sortBy;
module.exports.sortDirection = sortDirection;
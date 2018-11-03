'use strict';

const counterCollection = 'todo_list_counters';

const todoStates = {
  Complete: 'complete', 
  Incomplete: 'incomplete'
};

const sortBy = {
  creation_date: 'creation_date',
  last_update_date: 'last_update_date'
};

const sortDirection = {
  desc: -1,
  asc: 1
};

module.exports.todoStates = todoStates;
module.exports.counterCollection = counterCollection;
module.exports.sortBy = sortBy;
module.exports.sortDirection = sortDirection;
'use strict';

const todoStates = {
  Complete: 'complete', 
  Incomplete: 'incomplete'
};

const sortBy = {
  creation_date: 'creation_date',
  last_update_date: 'last_update_date'
};

const sortDirection = {
  desc: 'desc',
  asc: 'asc'
};

module.exports.todoStates = todoStates;
module.exports.sortBy = sortBy;
module.exports.sortDirection = sortDirection;
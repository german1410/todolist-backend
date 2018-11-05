'use strict';

/**
 * Allowed state for a ToDo
 * @enum
 */
const todoStates = {
  Complete: 'complete', 
  Incomplete: 'incomplete'
};

/**
 * Available fields that can be used for ordering
 * @enum
 */
const orderBy = {
  creation_date: 'creation_date',
  last_update_date: 'last_update_date'
};

/**
 * Available order directions
 * @enum
 */
const orderDirection = {
  desc: 'desc',
  asc: 'asc'
};

/**
 * Provides common enumeration for service model object
 * @property {enum} todoStates     - Valid states for a ToDo
 * @property {enum} orderBy        - Fields allowed to use on order by paramters
 * @property {enum} orderDirection - Direction available in to request sorted results
 */
module.exports = {
  todoStates: todoStates,
  orderBy: orderBy,
  orderDirection: orderDirection
}
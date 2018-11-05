 'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const logger = require('../util/logger');
const modelConstants = require('../model/model-constants');
const counterCollection = 'todo_list_counters';
const config = require('../config/todo-service-config');

/**
 * Schema used to access the ToDo as subdocument of the ToDo List
 */
const todoEntrySchema = new mongoose.Schema({
  _id: {type: Number, index: true, unique: true, alias: 'id'},
  state: {
    type: String, 
    required: true, 
    default: modelConstants.todoStates.Incomplete, 
    enum: _.values(modelConstants.todoStates) },
  description: {type: String, required: true, trim: true, minlength: 1},
  due_date: Date,
},
{ 
  timestamps: { 
    createdAt: 'creation_date',
    updatedAt: 'last_update_date'
  },
  _id: false
});

/**
 * ToDo list main document. This holds list meta data and also the list 
 * of ToDos as subdocument
 */
const todoListSchema = new mongoose.Schema({
  id: {type: Number, index: true, unique: true},
  name: {type: String, required: true, trim: true, minlength: 1},
  next_todo_id: { type: Number, default: 0, required: true }, // Used to generated todo ids
  todos: [ todoEntrySchema ]
},
{
  autoCreate: config.db.auto_create,
  timestamps: { 
    createdAt: 'creation_date',
    updatedAt: 'last_update_date'
  }
});

// Add plugin to auto generated the list ids
todoListSchema.plugin(AutoIncrement, 
                      {
                        id: 'todo_list_id',
                        inc_field: 'id', 
                        collection_name: counterCollection
                      });

// Model used to manipulate the list and todos
const todoListModel = mongoose.model('todo_list', todoListSchema);

/**
 * DAO used to maniulate ToDo lists and also the ToDos include inside them
 * @class
 */
class TodoListDao {

  /**
   * Creates a new list of ToDo with the provided name
   * @async
   * @param {string} listName name for the new list
   */
  async createList(listName) {
    if (_.isNil(listName)) {
      throw new Error('List name was not provided and is required');
    }

    logger.debug('TodoListDao.createList: Creating new list with name: %s', listName);
    return todoListModel.create({ name: listName });
  }

  /**
   * Search and return a ToDo list metadata for the list with the requested
   * unique id
   * @param {number} listId Unique id for the list. No the internal Mongo Db ObjectId but the auto generated
   */
  async findListById(listId) {
    verifyTargetListParameters(listId);

    // Avoid getting the list of ToDos
    let projection = {
      id: 1,
      name: 1,
      creation_date: 1,
      last_update_date: 1
    }
    
    logger.debug('TodoListDao.findListById: Searching for list with id: %s', listId);
    return todoListModel.findOne({ id: listId }, projection).exec();
  }

  /**
   * Delete a list and all associated ToDo entries
   * @param {number} listId Unique id for the list. No the internal Mongo Db ObjectId but the auto generated
   */
  async deleteListById(listId) {
    verifyTargetListParameters(listId);

    // Delte the list
    return new Promise(function(resolve, reject) {
      logger.debug('TodoListDao.deleteById: Deleting list with id: %s', listId);
      return todoListModel.deleteOne({ id: listId }, function(error) {
          if (error) {
            reject(error);
            return;
          }
          logger.debug('TodoListDao.deleteById: List with id: %s deleted', listId);
          resolve();
      });
    });
  }

  /**
   * Inserts a new ToDo inside the list
   * @param {number} listId    on which ToDo will be included
   * @param {object} entryData used to create the new ToDo
   */
  async createTodo(listId, entryData) {
    verifyTargetListParameters(listId);

    if (_.isNil(entryData)) {
      throw new Error('Entry data was not provided and is required');
    }

    try {
      logger.debug('TodoListDao.createTodo: Storing new ToDo: %j on list %d', entryData, listId);

      // Get the list first and then create the new
      // ToDo inside the list of ToDos which is an array of subdocuments
      // the response will indcated potential cases that are expected:
      //  -- the list does not exist
      // For each todo a unique id inside the list is generated based on
      // the sequence field 'next_todo_id'
      let promise = new Promise(function(resolve, reject) {
        todoListModel.findOneAndUpdate({ id: listId }, { $inc : { next_todo_id: 1 }}, { new: true }, function (error, list) {
          if (error) {
            logger.error('TodoListDao.createTodo: Error trying to find list with id %d', listId);
            reject(error);
            return;
          }

          if (_.isNil(list)) {
            logger.debug('TodoListDao.createTodo: List not found with id %d', listId);
            resolve({
              listNotFound: true
            });
            return;
          }

          // Include the new sequencial id generated from list metadata
          let dataWithId = _.assign( { _id: list.next_todo_id }, entryData);
          let todo = list.todos.create(dataWithId);
          list.todos.push(todo);
          list.save(function (error, updatedList) {
            if (error) {
              logger.error('TodoListDao.createTodo: Error trying to update list with id %d', listId);
              reject(error);
              return;
            }

            let todoAfterInsert = updatedList.todos.id(dataWithId._id);
            logger.debug('TodoListDao.createTodo: New ToDo: %j', todoAfterInsert);
            resolve({
              listNotFound: false,
              todo: todoAfterInsert
            });
          });
        });
      });

      return promise;
    } catch(error) {
      logger.error('TodoListDao.createTodo: Error trying to save new ToDo Entry: %s', error);
      throw error;
    }
  }

  /**
   * Get an specific ToDo from a list
   * @param {number} listId for which ToDo will be searched
   * @param {number} todoId id of the ToDo to get from the list
   */
  async findTodoById(listId, todoId) {
    verifyTargetTodoParameters(listId, todoId);

    logger.debug('TodoListDao.findTodoById: Searching ToDo, list %d - ToDo id %d', listId, todoId);
    let list = await todoListModel.findOne({ id: listId}).exec();

    if (_.isNil(list)) {
      return { listNotFound: true };
    }

    let todo = list.todos.id(todoId);
    return {
      listNotFound: false,
      todo: todo
    };
  }

  /**
   * Get all or a subset of Todos from a list
   * @param {number} listId         for which ToDos are retrieved
   * @param {number} index          offset for the first todo to retrieve once ToDos are sorted based on the specified criteria
   * @param {number} limit          maximum number to ToDos to retrieve
   * @param {string} sortedBy       field used to sort ToDos
   * @param {string} sortDirection  direction for sorting
   */
  async getTodos(listId, 
                 index = 0, 
                 limit = -1, 
                 sortedBy = modelConstants.orderBy.creation_date, 
                 sortDirection = modelConstants.orderDirection.desc) {

    verifyTargetListParameters(listId);

    let projection = {
      todos: 1
    }

    // Load the ToDos
    logger.debug('TodoListDao.getTodos: Searching ToDo, list %d', listId);
    let list = await todoListModel.findOne({ id: listId }, projection);

    if (_.isNil(list)) {
      return null;
    }

    if (_.isNil(list.todos)) {
      logger.error('TodoListDao.getTodos: Nil list of todos found');
      return null;
    }

    // Sort them
    let sortedTodos = _.sortBy(list.todos, [sortedBy, '_id']);

    if (sortDirection === modelConstants.orderDirection.asc) {
      sortedTodos = _.reverse(sortedTodos);
    }

    // Get the specific page of results
    if (limit > 0) {
      return _.slice(sortedTodos, index, index + limit);
    } else {
      return _.slice(sortedTodos, index);
    }
  }

  /**
   * Remove a ToDo from a list of Todos
   * @param {number} listId  from which ToDo will be removed
   * @param {number} todoId  Unique identifier of the Todo to remove. 
   *                         No the internal Mongo Db ObjectId but the auto generated
   */
  async deleteTodo(listId, todoId) {

    verifyTargetTodoParameters(listId, todoId);

    logger.debug('TodoListDao.deleteTodo: About to delete ToDo, list %d - ToDo id %d', listId, todoId);

    return new Promise(function(resolve, reject) {
      // Get the list and the apply the update
      todoListModel.findOne({ id: listId }, function (error, list) {
        if (error) {
          logger.error('TodoListDao.deleteTodo: Error trying to find list with id %d', listId);
          reject(error);
          return;
        }

        if (_.isNil(list)) {
          logger.debug('TodoListDao.deleteTodo: List not found with id %d', listId);
          resolve({ listNotFound: true });
          return;
        }

        // Find target ToDo
        let todo = list.todos.id(todoId);

        if (_.isNil(todo)) {
          logger.debug('TodoListDao.deleteTodo: Todo not found on list with id %d, todo id: %d', listId, todoId);
          resolve({ 
                    listNotFound: false,
                    todoNotFound: true
                  });
          return;
        }

        todo.remove();
        // Save the list after todo was removed
        list.save().then(() => resolve(
          { 
            listNotFound: false,
            todoNotFound: false
          }
        ), reject);
      });
    });
  }

  /**
   * Modifies partially a ToDo from a list
   * @param {number} listId    List id on which ToDo will be updated
   * @param {*} todoId         Unique identifier of the Todo to update. 
   *                           No the internal Mongo Db ObjectId but the auto generated
   * @param {*} partialUpdate  Information to modify on the Todo
   */
  async updateTodo(listId, todoId, partialUpdate) {
    verifyTargetTodoParameters(listId, todoId);

    if (_.isNil(partialUpdate)) {
      throw new Error('Update document is missing');
    }

    logger.debug('TodoListDao.updateTodo:Update ToDo, list %d, ToDo Id: %d using : %j', listId, todoId, partialUpdate);
    // Get the list an apply the updated
    return new Promise(function(resolve, reject) {
      todoListModel.findOne({ id: listId }, function (error, list) {
        if (error) {
          logger.error('TodoListDao.updateTodo: Error trying to find list with id %d', listId);
          reject(error);
          return;
        }

        if (_.isNil(list)) {
          logger.debug('TodoListDao.updateTodo: List not found with id %d', listId);
          resolve({ listNotFound: true });
          return;
        }

        // search for the ToDo
        let todo = list.todos.id(todoId);

        if (_.isNil(todo)) {
          logger.debug('TodoListDao.updateTodo: Todo not found on list with id %d, todo id: %d', listId, todoId);
          resolve({ 
                    listNotFound: false,
                    todoNotFound: true
                  });
          return;
        }

        // Apply the updatedo on the ToDo
        _.assign(todo, partialUpdate);
        list.save(function(error, list){
          if (error) {
            logger.error('TodoListDao.updateTodo: Error trying to save list with id %d after update for ToDo with id %d', listId, todoId);
            reject(error);
            return;
          }

          // Sabe the entire list because the ToDo is a subdocument
          let updatedTodo = list.todos.id(todoId);
          resolve({ 
            listNotFound: false,
            todoNotFound: false,
            todo: updatedTodo
          });
        });
      });
    });
  }
}

function verifyTargetListParameters(listId) {
  if (_.isNil(listId)) {
    throw new Error('List id was not provided and is required');
  }
}

function verifyTargetTodoParameters(listId, todoId) {
  verifyTargetListParameters(listId);

  if (_.isNil(todoId)) {
    throw new Error('Todo id was not provided and is required');
  }
}

module.exports = new TodoListDao();

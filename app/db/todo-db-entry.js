'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const dbConstants = require('./db-constants');
const {logger} = require('../util/logger');

const todoEntrySchema = new mongoose.Schema({
  id: {type: Number, index: true},
  list_id: { type: ObjectId, required: true, index: true },
  state: {
    type: String, 
    required: true, 
    default: dbConstants.todoStates.Incomplete, 
    enum: _.values(dbConstants.todoStates) },
  description: {type: String, required: true, trim: true, minlength: 1},
  due_date: Date
},
{ 
  timestamps: { 
    createdAt: 'creation_date',
    updatedAt: 'last_update_date'
  }
});


todoEntrySchema.plugin(AutoIncrement, 
                       {
                          id: 'todo_entry_id', 
                          inc_field: 'id', 
                          collection_name: dbConstants.counterCollection, 
                          reference_field: 'list_id'
                        });

const todoEntryModel = mongoose.model('todo_entries', todoEntrySchema);

class TodoEntryDao {
  async createTodo(list, entryData) {
    if (isInvalidList(list)) {
      throw new Error('Invalid List was provided');
    }

    if (_.isNil(entryData)) {
      throw new Error('Entry data was not provided and is required');
    }

    try {
      let newTodo = _.assign({ list_id: list._id }, entryData);
      logger.debug('Storing new ToDo: %j', newTodo);
      let todo = await todoEntryModel.create(newTodo);
      return todo;
    } catch(error) {
      logger.error('Error trying to save new ToDo Entry: %s', error);
      throw error;
    }
  }

  async findById(list, todoId) {
    if (isInvalidList(list)) {
      throw new Error('Invalid List was provided');
    }

    if (_.isNil(todoId)) {
      throw new Error('List id was not provided and is required');
    }

    logger.debug('Searching ToDo, list %d - ToDo id %d', list.id, todoId);
    return todoEntryModel.findOne({ list_id: list._id, id: todoId });
  }

  async deleteListTodos(list) {
    if (isInvalidList(list)) {
      throw new Error('Invalid List was provided');
    }

    logger.debug('Delete all ToDo\'s from list %d', list.id);
    await todoEntryModel.deleteMany({ list_id: list._id });
  }

  async deleteTodo(list, todoId) {

    if (isInvalidList(list)) {
      throw new Error('Invalid List was provided');
    }

    if (_.isNil(todoId)) {
      throw new Error('List id was not provided and is required');
    }

    logger.debug('About to delete ToDo, list %d - ToDo id %d', list.id, todoId);
    await todoEntryModel.deleteOne({ list_id: list._id, id: todoId });
  }

  async save(todo) {
    if (_.isNil(todo)) {
      throw new Error('Todo entry missing');
    }

    logger.debug('Update ToDo, list %j ', todo);
    return todoEntryModel.update(todo);
  }


  async getTodos(list, index = 0, 
                 limit = -1, 
                 sortedBy = dbConstants.sortBy.creation_date, 
                 sortDirection = dbConstants.sortDirection.desc) {

    if (isInvalidList(list)) {
      throw new Error('Invalid List was provided');
    }

    logger.debug('Searching ToDo, list %d', list.id);
    let options = {
      skip: index,
      limit: limit,
      sort: { }
    };
    options.sort[sortedBy] = sortDirection;
    // Disambiguation
    options.sort['id'] = 1;
    return todoEntryModel.find({ list_id: list._id}, null, options);
  }

}

function isInvalidList(list) {
  return _.isNil(list) || _.isNil(list._id);
}

module.exports.todoEntryDao = new TodoEntryDao();



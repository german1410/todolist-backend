 'use strict';

const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const {counterCollection} = require('./db-constants');
const config = require('../config/todo-service-config');

const todoListSchema = new mongoose.Schema({
  id: {type: Number, index: true},
  name: {type: String, required: true, trim: true, minlength: 1}
},
{
  autoCreate: config.db.auto_create
});

todoListSchema.plugin(AutoIncrement, 
                      {
                        id: 'todo_list_id',
                        inc_field: 'id', 
                        collection_name: counterCollection
                      });

const todoListModel = mongoose.model('todo_list', todoListSchema);

class TodoListDao {

  async createList(listName) {
    if (!listName) {
      throw new Error('List name was not provided and is required');
    }

    let list = await todoListModel.create({ name: listName });
    return { list: list };
  }

  async findById(listId) {
    if (!listId) {
      throw new Error('List id was not provided and is required');
    }
    
    return todoListModel.findOne({ id: listId }).exec();
  }

  async deleteById(listId) {
    if (!listId) {
      throw new Error('List id was not provided and is required');
    }

    return todoListModel.deleteOne({ id: listId }).exec();
  }
}

module.exports.todoListDao = new TodoListDao();

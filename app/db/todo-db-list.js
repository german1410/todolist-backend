'use strict';

const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const config = require('../config/todo-service-config');

const todoListSchema = new mongoose.Schema({
  id: {type: Number, index: true},
  name: {type: String, required: true, trim: true, minlength: 1}
},
{
  autoCreate: config.db.autoCreate
});
todoListSchema.plugin(AutoIncrement, 
                      {id: 'todo_list_id', inc_field: 'id', collection_name: 'todo_list_counters'});

const todoList = mongoose.model('todo_list', todoListSchema);

class TodoListDao {

  createList(listName) {
    return todoList.create({name: listName});
  }

  findById(id) {
    return todoList.findOne({ id: id});
  }
}

module.exports = new TodoListDao();

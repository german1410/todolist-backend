'use strict';

const mongoose = require('mongoose');

const config = require('../config/todo-service-config');

let todoListSchema = new mongoose.Schema({
  name: {type: String, required: true, trim: true, minlength: 1}
},
{
  autoCreate: config.db.autoCreate
});

let todoList = mongoose.model('ToDoList', todoListSchema);

class TodoListDao {

  createList(listName) {
    return todoList.create({name: listName});
  }
}

module.exports = new TodoListDao();


db.createCollection('todo_list_counters');

db.getCollection('todo_list_counters').createIndex({ field: 1, model: 1 }, { unique: true });

db.createCollection('todo_lists');

db.getCollection('todo_lists').createIndex({ id: 1 }, { unique: true });
const mongoose = require('mongoose');
const hippie = require('hippie');

const logger = require('../../app/util/logger');
const config = require('../../app/config/todo-service-config');

function createLogAndCallbackHandler(message) {
  return (error) => {
    logger.error('%s: %s', message, error);
    throw error;
  }
}

async function dropCollection(collectionName) {
  return new Promise(function (resolve, reject) {
    mongoose.connection.db.listCollections({name: collectionName})
                          .next(function(err, collinfo) {
                              if (err) {
                                logger.error('Error trying to get collections');
                                reject(err);
                              }

                              if (collinfo) {
                                return mongoose.connection.dropCollection(collectionName)
                                                          .then(resolve, 
                                                                createLogAndCallbackHandler(`Unable to drop collection ${collectionName}`));
                              } else {
                                resolve();
                              }
                          });
  });

}

async function cleanUpDb() {
  try {
    if (!mongoose.connection || !mongoose.connection.db) {
      await mongoose.connect(config.db.url);
    }
    await dropCollection('todo_lists');
    await dropCollection('todo_list_counters');
  } catch (error) {
    logger.error('Error on clean up: %s', error);
    throw error;
  }
}

function createList(server, listName) {
  return hippie(server)
            .json()
            .post('/todo/api/lists')
            .send({
              name: listName
            })
            .expectStatus(201)
            .end()
              .then(function (response) {
                let parsedBody = JSON.parse(response.body);
                return parsedBody;
              })
              .catch(createLogAndCallbackHandler(`Unable to create ToDo list ${listName}`));
}

function createTodo(server, listId, todo, timeout=1000) {
  return hippie(server)
                .json()
                .timeout(timeout)
                .post(`/todo/api/lists/${listId}/todos`)
                .send(todo)
                .expectStatus(201)
                .end()
                  .then(function (response) {
                    let parsedBody = JSON.parse(response.body);
                    return parsedBody;
                  })
                  .catch(createLogAndCallbackHandler(`Unable to create ToDo for list ${listId}`));
}

module.exports.cleanUpDb = cleanUpDb;
module.exports.createList = createList;
module.exports.createTodo = createTodo;
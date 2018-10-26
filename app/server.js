'use strict';

const restify = import('restify');

let server = restify.createServer({
    name: 'todo-list'
});

server.use(restify.plugins.strictQueryParams());

// TODO Parameterize port
server.listent(8080);
FROM node:8

USER node

WORKDIR /opt/todo-list
COPY package*.json ./
RUN npm install
COPY . .
RUN makedir log

ENV NODE_ENV production
#ENV MONGO_DB_URL mongodb://todo-list-db-0.todo-list-db:27017/todoList
#ENV TODO_SRV_PORT 8080
EXPOSE 8080

CMD [ "npm", "start" ]
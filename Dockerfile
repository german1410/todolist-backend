FROM node:8

# Create application directory
RUN mkdir /opt/todo-list
RUN chown node:node /opt/todo-list

# Chagne to non-root used
USER node

# Install the app
WORKDIR /opt/todo-list
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir log

# Set environment commands
ENV NODE_ENV production
#ENV MONGO_DB_URL mongodb://todo-list-db-0.todo-list-db:27017/todoList
#ENV TODO_SRV_PORT 8080
EXPOSE 8080

CMD [ "npm", "start" ]
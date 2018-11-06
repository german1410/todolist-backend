# ToDo List REST API
REST web API used to track TODO items on different lists.

## Exposed Resources

The following are the URIs associated to the exposed resorces by this API.
Base path for REST API is _/todo/api/_ then the first level are ToDo **list**
which contains a list of **ToDo Entries**.

The following are the avaialble endpoints:

* **POST _/todo/api/lists_**: Used to create new lists
* **GET  _/todo/api/lists/{listId}_**: Retrieves metadata information about an specific list
* **DELETE  _/todo/api/lists/{listId}_**: Delete a ToDo list and all ToDo entries asociated with it
* **GET  _/todo/api/lists/{listId}/todos_**: Retrieves all or a subset of ToDo entries for an specific list
* **POST _/todo/api/lists/{listId}/todos_**: Used to create new ToDo entries inside a list
* **GET  _/todo/api/lists/{listId}/todos/{todoId}_**: Retrieves information about an specific ToDo
* **DELETE  _/todo/api/lists/{listId}/todos/{todoId}_**: Deletes a ToDo entry from the list
* **PATCH  _/todo/api/lists/{listId}/todos/{todoId}_**: Performs a partial update on a ToDo entry

More informaiton can be found on [Swagger API documentation](doc/api_doc.json)

## Mongo DB Schema

There were basically two options in order to store ToDo lists on Mongo DB
1. De-normalized structire. A single collection with list metadata and ToDos as an array of subdocuments
1. Normalized structure. Two collections, one for list metadata and other for the ToDos

In our case, De-nomalized approach fits better because:
* Maximum document size is 16Mb so far. For a list of ToDo's, those are far too many todos
* No need o transaction or clean up jobs. Once the list is deleted all ToDos are also deleted. 
For nomalized structure, we would need to delete document on two differnet collection and in case of failure or race conditions it is possible to create orphan ToDo's.
* Atomic changes. Since mongo ensures updates on a document are atomic, we know any update on the list or
ToDo's will be atomic. This will prevent race conditions on differente request that modifies the list and ToDos at the same time.


## Service Configuration

The following are environment variables used by the service:
* **NODE_ENV**: If set to _development_, the service will log using **DEBUG** level and also create collections and indexes on Mongo Db automatically. Otherwise, the environment is assumed to be _production_, log level is restricted to **INFO** and Mongo DB structure is asumed to be created already.
* **MONGO_DB_URL**: The connection URL used by the service to connect with Mongo DB. Default URL is _mongodb://127.0.0.1:27017/todoList_
* **TODO_SRV_PORT**: Specify the port on which the service will listent for incomming request. Default is 8080
* **TODO_SERACH_DEFAULT_LIMIT**: Specifies the default limit of ToDo's to return on a response. For endpoint **GET  _/todo/api/lists/{listId}/todos/{todoId}_** if no limit paramter is provided, the default will be used. Default limit is 100.

## Running the service locally

In order to run the service locally just execute 
```
  npm start
```
It is possible to set configuration variable, for example
```
  NODE_ENV=development TODO_SRV_PORT=9080 npm start
```

## Create Docker Image

In order to create docker image, just execute
```
  npm run-script build-image
```
In order to build and tag the image, use
```
  npm run-script tag-image
```
Take into account that repostory is by default *german1410/todo-list* and the tag matches package version

## Deploy service into kubernetes

In order to deploy the image into kubernetes, there is a _deployment_ configuration file located at
[kubernetes/todo-list.yaml](kubernetes/todo-list.yaml). This configuration file will deploy the image and create a service to expose
the API using a *Load Balancer*. The url for the DB is set to _mongodb://todo-list-db-0.todo-list-db:27017/todoList_, this can be modified in case there is another service already present on kubernets with Mongo Db.
Another _deployment_ configuration file [kubernetes/mongo-db.yaml](kubernetes/mongo-db.yaml) is provided in order to create a *StatefulSet* with Mongo Db running as *ReplicaSet*. Also script that can be used to initialize such DB are located at [mongodb](mongodb). For Mongo running as replica set, use the configuration scirpt without validation schema.

If order to create the DB, execute:

```
  kubectl create -f kubernetes/mongo-db.yaml
```

Wait until the service is up and running and then connect to the DB and initialize the collections.
You can connect to the DB pod using
```
  kubectl exec -ti todo-list-db-0 -- bash
```
And then connect to Mongo Db using
```
  mongo mongodb://todo-list-db-0.todo-list-db:27017/todoList
```

Once the DB is initialized, the containers and services can be deployed using
```
  kubectl create -f kubernetes/todo-list.yaml
```

Then get kubernetes public ip. In the case of *minikube* that can be done using ```minikube ip```.
Then verify the port on which the service load balancer is listning using ```kubectl get service todo-list-api```, the output shall be similar to:
```
Name:                     todo-list-api
Namespace:                default
Labels:                   <none>
Annotations:              kubernetes.io/change-cause=kubectl.exe create --filename=.\kubernetes\todo-list.yaml --record=true
Selector:                 app=todo-list,tier=rest-api
Type:                     LoadBalancer
IP:                       10.109.134.229
Port:                     <unset>  8080/TCP
TargetPort:               8080/TCP
NodePort:                 <unset>  32105/TCP
Endpoints:                172.17.0.6:8080,172.17.0.7:8080
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>
```

Now it is possible to access the service using the ip and _NodePort_:
```
  $ curl -X POST -H "Content-Type: application/json" --data-raw '{ "name": "Test ToDo List" }' http://192.168.1.22:32105/todo/api/lists
{"id":1,"name":"Test ToDo List"}

```

## Pending

There are two extra endpoint that are supposed to be used for liveness and readiness probes,
but unfortunatelly I was not able to finish with the set up. Endpoint are:

* **GET  _/todo/api/health-check_**
* **GET  _/todo/api/ready_**

Probe configuratio is present on _deployment_ fileds but commented out

Only basic pagination paramters are provided in orde to get ToDo's from the list.
It should be also possible to implement result set management by adding _after_ and _before_
parameters so pagination is not index based but based on the last element the user has.
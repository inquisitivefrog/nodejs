# nodejs
Applications developed using NodeJS and popular related tools with help from Cursor 2.2.20

1. helloworld
   basic NodeJS app tested with Jest
   deployed using docker-compose

2. mobile-app-server
   MERN app (MongoDB, Express, React, NodeJS)
   deployed using docker-compose
   mobile requests supported by multiple web app servers behind a load balancer
   data cached in Redis, stored in MongoDB cluster
   mobile app server managed by an admin dashboard, documented with Swagger
   mobile app server tested with Mongoose
   MongoDB configured for sharding over two AWS regions
   monitored using Grafana, Prometheus
   


Review docker-compose.yml keys
% yq '.services | keys[]' docker-compose.yml
% yq '.services | keys | join(", ")' docker-compose.yml 

Generate a secure JWT secret
% openssl rand -base64 32

Start the debug service
% docker compose up -d debug

Access the container
% docker compose exec debug sh

MongoDB CLI
% mongosh mongodb://mongdb:27017

Test API with curl
% curl http://server:3000/health
% curl http://server:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin123"}'

Inspect MongoDB
# mongosh mongodb://mongodb:27017/mobileapp
mobileapp> show collections
users
mobileapp> db.users.find().pretty()
mobileapp> db.users.findOne({ email: "admin@example.com" })



Create an Admin user
% docker-compose exec server npm run create-admin

Access the application by browser
Admin Dashboard: http://localhost
API Server: http://localhost:3000
API Health Check: http://localhost:3000/health
MongoDB: localhost:27017

Login
email: admin@example.com
password: admin123

% docker-compose exec debug bash
cd server
npm install
npm run dev

% docker-compose exec debug bash
cd admin-dashboard
npm install
npm start


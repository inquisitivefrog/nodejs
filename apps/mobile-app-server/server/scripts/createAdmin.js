require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const { getReadUserModel, getWriteUserModel } = require('../src/utils/db-helper');

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if admin already exists (use read pool)
    const ReadUser = await getReadUserModel();
    const existingAdmin = await ReadUser.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user (use write pool)
    const WriteUser = await getWriteUserModel();
    const admin = await WriteUser.create({
      email: 'admin@example.com',
      password: 'admin123', // Change this in production!
      name: 'Admin User',
      role: 'admin',
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();



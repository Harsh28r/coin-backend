import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://harshgupta0028:M028663@cluster0.fucrcoy.mongodb.net/coins?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Seed database with admin user
 */
async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user exists
    const existingAdmin = await User.findOne({ email: 'admin@arbitrage.com' });

    if (existingAdmin) {
      console.log('Admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@arbitrage.com',
      password: 'admin123456', // Change this!
      role: 'admin',
      isActive: true,
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('Email: admin@arbitrage.com');
    console.log('Password: admin123456');
    console.log('⚠️ IMPORTANT: Change the password after first login!');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedDatabase();

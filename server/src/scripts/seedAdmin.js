/**
 * Admin Seed Script
 *
 * Creates the initial administrator account securely.
 * Run: npm run seed:admin
 *
 * Uses ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD from .env
 * This script should NOT be exposed as a public API endpoint.
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nutmeg.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Admin';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${adminEmail}`);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash: adminPassword, // Pre-save hook will hash this
      role: 'admin',
    });

    console.log(`✅ Admin user created successfully:`);
    console.log(`   Name:  ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role:  ${admin.role}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error seeding admin:`, error.message);
    process.exit(1);
  }
};

seedAdmin();

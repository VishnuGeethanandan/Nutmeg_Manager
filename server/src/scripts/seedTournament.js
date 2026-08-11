const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const connectDB = require('../config/db');

dotenv.config();

const seedTournament = async () => {
  try {
    await connectDB();

    const existingTournament = await Tournament.findOne({ year: 2026 });
    if (existingTournament) {
      console.log(`⚠️  Tournament already exists: ${existingTournament.name}`);
      process.exit(0);
    }

    const tournament = await Tournament.create({
      name: 'Nutmeg 2026',
      year: 2026,
      status: 'ongoing',
      maxTeams: 8,
    });

    console.log(`✅ Tournament created successfully:`);
    console.log(`   Name:  ${tournament.name}`);
    console.log(`   Year:  ${tournament.year}`);
    console.log(`   ID:    ${tournament._id}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error seeding tournament:`, error.message);
    process.exit(1);
  }
};

seedTournament();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const CaptainRequest = require('../models/CaptainRequest');
const Player = require('../models/Player');
const Team = require('../models/Team');
const connectDB = require('../config/db');

dotenv.config();

async function checkState() {
  await connectDB();
  const vishnu = await Player.findOne({ name: 'Vishnu G' });
  console.log('Vishnu G:', vishnu);
  const mcaTeam = await Team.findOne({ name: 'MCA' });
  console.log('MCA Team:', mcaTeam);
  const playerOne = await Player.findOne({ name: 'Player One' });
  console.log('Player One:', playerOne);
  process.exit(0);
}
checkState();

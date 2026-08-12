const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const connectDB = require('../config/db');

dotenv.config();

async function inspectData() {
  await connectDB();
  
  const users = await User.find({}, 'name email role');
  console.log('\n--- USERS ---');
  users.forEach(u => console.log(`${u._id} | ${u.name} | ${u.email} | ${u.role}`));
  
  const players = await Player.find({}, 'name admissionNumber departmentName isCaptain');
  console.log('\n--- PLAYERS ---');
  players.forEach(p => console.log(`${p._id} | ${p.name} | ${p.admissionNumber} | ${p.departmentName} | Cap:${p.isCaptain}`));
  
  const teams = await Team.find({}, 'name tournamentId captainId');
  console.log('\n--- TEAMS ---');
  teams.forEach(t => console.log(`${t._id} | ${t.name} | Tourn:${t.tournamentId} | Cap:${t.captainId}`));
  
  const tournaments = await Tournament.find({}, 'name year');
  console.log('\n--- TOURNAMENTS ---');
  tournaments.forEach(t => console.log(`${t._id} | ${t.name} | ${t.year}`));

  process.exit(0);
}
inspectData();

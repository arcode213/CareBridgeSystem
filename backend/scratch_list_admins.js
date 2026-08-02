const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./src/models/User');
  
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const result = await User.updateOne(
    { email: 'admin@carebridge.local' },
    { $set: { passwordHash, status: 'active', isEmailVerified: true, isPhoneVerified: true } }
  );
  
  console.log('Update result:', result);
  process.exit();
}
run().catch(console.error);

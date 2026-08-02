const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const Referral = require('../models/Referral');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Referral.deleteMany({ patientName: { $in: ['Validation Test Patient', 'Test Patient'] } });
  console.log('Cleaned up test referrals successfully');
  process.exit(0);
})();

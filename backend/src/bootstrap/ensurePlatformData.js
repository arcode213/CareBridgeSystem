const bcrypt = require('bcrypt');
const DepartmentCatalog = require('../models/DepartmentCatalog');
const ScoringConfig = require('../models/ScoringConfig');
const PlatformSettings = require('../models/PlatformSettings');
const User = require('../models/User');

const DEFAULT_DEPARTMENTS = [
  { name: 'Internal Medicine', keywords: ['fever', 'fatigue', 'general', 'flu', 'cold'], sortOrder: 0 },
  { name: 'Cardiology', keywords: ['chest pain', 'shortness of breath', 'heart', 'palpitation'], sortOrder: 1 },
  { name: 'Orthopedics', keywords: ['fracture', 'bone pain', 'joint', 'sprain'], sortOrder: 2 },
  { name: 'Neurology', keywords: ['headache', 'seizure', 'stroke', 'numbness'], sortOrder: 3 },
  { name: 'Gastroenterology', keywords: ['stomach ache', 'nausea', 'vomit', 'diarrhea'], sortOrder: 4 },
  { name: 'General Surgery', keywords: ['surgery', 'appendix', 'hernia'], sortOrder: 5 },
  { name: 'Pediatrics', keywords: ['child', 'infant', 'pediatric'], sortOrder: 6 },
];

async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || 'admin@carebridge.local').toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    return;
  }

  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const name = process.env.ADMIN_NAME || 'CareBridge Admin';
  const phone = process.env.ADMIN_PHONE || '+920000000000';

  await User.create({
    name,
    email,
    phone,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    status: 'active',
  });

  console.log(`Seeded admin user: ${email}`);
}

async function ensurePlatformData() {
  const count = await DepartmentCatalog.countDocuments();
  if (count === 0) {
    await DepartmentCatalog.insertMany(DEFAULT_DEPARTMENTS);
    console.log('Seeded DepartmentCatalog');
  }

  const scCount = await ScoringConfig.countDocuments();
  if (scCount === 0) {
    await ScoringConfig.create({});
    console.log('Seeded ScoringConfig');
  }

  const psCount = await PlatformSettings.countDocuments();
  if (psCount === 0) {
    await PlatformSettings.create({ payoutPaisaPerClosedCase: 100000 });
    console.log('Seeded PlatformSettings');
  }

  await ensureAdminUser();
}

module.exports = { ensurePlatformData };

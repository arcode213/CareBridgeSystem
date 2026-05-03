const mongoose = require('mongoose');

const PlatformSettingsSchema = new mongoose.Schema(
  {
    payoutPaisaPerClosedCase: { type: Number, default: 100000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);

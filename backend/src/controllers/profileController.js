const Hospital = require('../models/Hospital');
const Consultant = require('../models/Consultant');
const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    let profileData = {};

    if (user.role === 'hospital') {
      const hospital = await Hospital.findOne({ userId: user._id });
      profileData = hospital;
    } else if (user.role === 'consultant') {
      const consultant = await Consultant.findOne({ userId: user._id });
      profileData = consultant;
    }

    res.json({
      success: true,
      data: {
        user,
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, ...otherData } = req.body;
    const user = await User.findById(req.user.id);

    // Update User basic info
    if (name) user.name = name;
    if (phone) user.phone = phone;
    await user.save();

    // Protect sensitive fields from being updated directly via profile
    delete otherData.verificationDocuments;
    delete otherData.registrationDocuments;
    delete otherData.walletBalance;
    delete otherData.isActive;

    let updatedProfile = {};

    if (user.role === 'hospital') {
      const hospital = await Hospital.findOne({ userId: user._id });
      
      // Handle paymentGatewayCredentials specifically
      if (otherData.paymentGatewayCredentials) {
        hospital.paymentGatewayCredentials = {
          ...hospital.paymentGatewayCredentials,
          ...otherData.paymentGatewayCredentials
        };
        delete otherData.paymentGatewayCredentials;
      }

      // Update other fields
      Object.assign(hospital, otherData);
      await hospital.save();
      updatedProfile = hospital;
    } else if (user.role === 'consultant') {
      const consultant = await Consultant.findOne({ userId: user._id });

      // Handle payoutAccount specifically
      if (otherData.payoutAccount) {
        consultant.payoutAccount = {
          ...consultant.payoutAccount,
          ...otherData.payoutAccount
        };
        delete otherData.payoutAccount;
      }

      Object.assign(consultant, otherData);
      await consultant.save();
      updatedProfile = consultant;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
        profile: updatedProfile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

exports.toggleFavoriteHospital = async (req, res) => {
  try {
    const { hospitalId } = req.body;
    if (!hospitalId) return res.status(400).json({ success: false, message: 'Hospital ID is required' });

    const user = await User.findById(req.user.id);
    if (user.role !== 'consultant') {
      return res.status(403).json({ success: false, message: 'Only consultants can have favorites' });
    }

    const consultant = await Consultant.findOne({ userId: user._id });
    if (!consultant) return res.status(404).json({ success: false, message: 'Consultant not found' });

    const index = consultant.preferredHospitals.indexOf(hospitalId);
    if (index === -1) {
      consultant.preferredHospitals.push(hospitalId);
    } else {
      consultant.preferredHospitals.splice(index, 1);
    }

    await consultant.save();
    
    res.json({ success: true, data: consultant.preferredHospitals });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Server error updating favorites' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid current password' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

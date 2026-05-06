const User = require('../models/User');
const Consultant = require('../models/Consultant');
const Hospital = require('../models/Hospital');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');

const ALLOWED_WARDS = ['General', 'Private', 'ICU', 'NICU', 'PICU'];

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

function parseHospitalRegistration(body) {
  const departments = body.departments;
  if (!Array.isArray(departments) || departments.length === 0) {
    return { error: 'Select at least one department' };
  }
  const cleanedDepts = [...new Set(departments.map((d) => String(d).trim()).filter(Boolean))];
  if (cleanedDepts.length === 0) {
    return { error: 'Select at least one department' };
  }

  const lat = parseFloat(body.location?.lat ?? body.lat);
  const lng = parseFloat(body.location?.lng ?? body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: 'Valid location latitude and longitude are required' };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: 'Latitude or longitude out of range' };
  }

  const rows = body.bedsInventory || body.beds;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: 'Bed inventory is required for all wards' };
  }

  const inventory = [];
  for (const row of rows) {
    const ward = row.ward;
    if (!ALLOWED_WARDS.includes(ward)) {
      continue;
    }
    const totalBeds = Number(row.totalBeds);
    const availableBeds = Number(row.availableBeds);
    if (!Number.isFinite(totalBeds) || totalBeds < 0) {
      return { error: `Invalid total beds for ${ward}` };
    }
    if (!Number.isFinite(availableBeds) || availableBeds < 0 || availableBeds > totalBeds) {
      return { error: `Invalid available beds for ${ward}` };
    }
    inventory.push({
      ward,
      totalBeds,
      availableBeds,
      occupiedBeds: Math.max(0, totalBeds - availableBeds),
    });
  }

  const wardsPresent = new Set(inventory.map((i) => i.ward));
  for (const w of ALLOWED_WARDS) {
    if (!wardsPresent.has(w)) {
      return { error: `Bed row required for ward: ${w}` };
    }
  }

  const general = inventory.find((i) => i.ward === 'General');
  if (!general || general.availableBeds < 1) {
    return { error: 'General ward must have at least 1 available bed' };
  }

  return {
    departments: cleanedDepts,
    location: { type: 'Point', coordinates: [lng, lat] },
    bedsInventory: inventory,
  };
}

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!['consultant', 'hospital'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role for registration' });
    }

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, phone, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      passwordHash,
      role,
      status: 'pending',
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Send verification email (async)
    sendVerificationEmail(user, verificationToken);

    if (role === 'consultant') {
      const pmdc = String(req.body.pmdcNumber || '').trim();
      if (!pmdc || /^pending-/i.test(pmdc)) {
        await User.deleteOne({ _id: user._id });
        return res.status(400).json({ success: false, message: 'Valid PMDC number is required' });
      }

      const dupPmdc = await Consultant.findOne({ pmdcNumber: pmdc });
      if (dupPmdc) {
        await User.deleteOne({ _id: user._id });
        return res.status(400).json({ success: false, message: 'PMDC number already registered' });
      }

      await Consultant.create({
        userId: user._id,
        pmdcNumber: pmdc,
        specialty: (req.body.specialty || 'General').trim(),
        clinicName: req.body.clinicName?.trim(),
        clinicAddress: req.body.clinicAddress?.trim(),
      });
    } else if (role === 'hospital') {
      const regNum = String(req.body.registrationNumber || '').trim();
      if (!regNum) {
        await User.deleteOne({ _id: user._id });
        return res.status(400).json({ success: false, message: 'Hospital registration number is required' });
      }

      const parsed = parseHospitalRegistration(req.body);
      if (parsed.error) {
        await User.deleteOne({ _id: user._id });
        return res.status(400).json({ success: false, message: parsed.error });
      }

      await Hospital.create({
        userId: user._id,
        hospitalName: (req.body.hospitalName || name).trim(),
        registrationNumber: regNum,
        address: req.body.address?.trim(),
        departments: parsed.departments,
        location: parsed.location,
        bedsInventory: parsed.bedsInventory,
        ratePackages: Array.isArray(req.body.ratePackages) ? req.body.ratePackages : [],
        isActive: false,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email to proceed.',
      data: { userId: user._id, role: user.role, status: user.status },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase()?.trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email address before logging in.',
        needsVerification: true 
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Account is pending approval' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account is suspended' });
    }

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during email verification' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'User not eligible for refresh' });
    }

    const accessToken = generateToken(user);
    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error during refresh' });
  }
};

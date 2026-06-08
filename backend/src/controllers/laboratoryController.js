const mongoose = require('mongoose');
const Laboratory = require('../models/Laboratory');
const LabInvestigation = require('../models/LabInvestigation');
const Referral = require('../models/Referral');
const User = require('../models/User');
const Consultant = require('../models/Consultant');
const Payout = require('../models/Payout');
const { logAction } = require('../utils/logger');
const notificationService = require('../services/notificationService');
const { generateLabReportPDF } = require('../utils/pdfGenerator');
const path = require('path');

// Get own laboratory profile
exports.getMyProfile = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }
    res.json({ success: true, data: lab });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
};

// Update own laboratory profile (branding, address, rate packages)
exports.updateProfile = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }

    const allowed = ['city', 'area', 'address', 'departments', 'ratePackages'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    Object.assign(lab, updates);
    await lab.save();

    await logAction({
      req,
      action: 'LAB_PROFILE_UPDATED',
      entityId: lab._id,
      entityModel: 'Laboratory',
      details: updates
    });

    res.json({ success: true, message: 'Profile updated successfully', data: lab });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// Unlock patient data using Referral Code (Stage 2)
exports.unlockPatient = async (req, res) => {
  try {
    const { referralCode } = req.body;
    if (!referralCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Referral Code is required' });
    }

    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }

    const referral = await Referral.findOne({ referralCode: referralCode.trim().toUpperCase() })
      .populate({
        path: 'consultantId',
        select: 'userId specialty PMDC',
        populate: { path: 'userId', select: 'name email phone' }
      });

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Invalid or expired Referral Code' });
    }

    const labInvestigation = await LabInvestigation.findOne({
      referralId: referral._id,
      laboratoryId: lab._id
    });

    if (!labInvestigation) {
      return res.status(404).json({ success: false, message: 'No investigation order matches this Referral Code for your laboratory' });
    }

    // Auto-transition to awaiting_collection if currently in order_received
    if (labInvestigation.status === 'order_received') {
      labInvestigation.status = 'awaiting_collection';
      await labInvestigation.save();
    }

    res.json({
      success: true,
      message: 'Patient record unlocked successfully',
      data: {
        referral: referral.toJSON(),
        investigation: labInvestigation
      }
    });
  } catch (error) {
    console.error('unlockPatient error:', error);
    res.status(500).json({ success: false, message: 'Server error while unlocking patient' });
  }
};

// Phlebotomist collects sample (Stage 3)
exports.collectSample = async (req, res) => {
  try {
    const { id } = req.params;
    const { barcode } = req.body;

    if (!barcode?.trim()) {
      return res.status(400).json({ success: false, message: 'Barcode is required' });
    }

    const lab = await Laboratory.findOne({ userId: req.user.id });
    const investigation = await LabInvestigation.findOne({ _id: id, laboratoryId: lab._id });

    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Investigation not found' });
    }

    if (investigation.status !== 'awaiting_collection' && investigation.status !== 'order_received') {
      return res.status(400).json({ success: false, message: 'Sample already collected or in processing' });
    }

    investigation.barcode = barcode.trim();
    investigation.status = 'collected';
    investigation.collectionDate = new Date();
    await investigation.save();

    await logAction({
      req,
      action: 'LAB_SAMPLE_COLLECTED',
      entityId: investigation._id,
      entityModel: 'LabInvestigation',
      details: { barcode }
    });

    const populatedInv = await LabInvestigation.findById(investigation._id).populate('referralId');
    const consultant = await Consultant.findById(investigation.consultantId).populate('userId');
    if (consultant?.userId) {
      notificationService.notifyLabStatusUpdate(consultant.userId, populatedInv.referralId, 'Collected').catch(console.error);
      const io = req.app.get('io');
      if (io) io.to(`consultant:${consultant._id}`).emit('lab_status_update', { investigationId: investigation._id, status: 'collected' });
    }

    res.json({ success: true, message: 'Sample collection logged successfully', data: investigation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error collecting sample' });
  }
};

// Route sample to department section (Stage 4)
exports.routeSampleToSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { section } = req.body; // Biochemistry, Haematology etc.

    if (!section?.trim()) {
      return res.status(400).json({ success: false, message: 'Section is required' });
    }

    const lab = await Laboratory.findOne({ userId: req.user.id });
    const investigation = await LabInvestigation.findOne({ _id: id, laboratoryId: lab._id });

    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Investigation not found' });
    }

    investigation.section = section.trim();
    investigation.status = 'in_processing';
    investigation.processingStartedAt = new Date();
    await investigation.save();

    const populatedInv = await LabInvestigation.findById(investigation._id).populate('referralId');
    const consultant = await Consultant.findById(investigation.consultantId).populate('userId');
    if (consultant?.userId) {
      notificationService.notifyLabStatusUpdate(consultant.userId, populatedInv.referralId, `In Processing (${section.trim()})`).catch(console.error);
      const io = req.app.get('io');
      if (io) io.to(`consultant:${consultant._id}`).emit('lab_status_update', { investigationId: investigation._id, status: 'in_processing', section: section.trim() });
    }

    res.json({ success: true, message: 'Sample routed to section', data: investigation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error routing sample' });
  }
};

// Pathologist / Senior QC Validation (Stage 5)
exports.validateResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { investigations, isCritical, qcFailed, qcFailureReason } = req.body;

    const lab = await Laboratory.findOne({ userId: req.user.id });
    const investigation = await LabInvestigation.findOne({ _id: id, laboratoryId: lab._id }).populate('referralId');

    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Investigation not found' });
    }

    if (qcFailed) {
      investigation.status = 'qc_failed';
      investigation.qcFailureReason = qcFailureReason || 'QC Check Failed';
      await investigation.save();

      // Notify consultant
      const consultant = await Consultant.findById(investigation.consultantId).populate('userId');
      if (consultant?.userId) {
        notificationService.notifyLabStatusUpdate(consultant.userId, investigation.referralId, 'QC Failed - Resample Required').catch(console.error);
        const io = req.app.get('io');
        if (io) io.to(`consultant:${consultant._id}`).emit('lab_status_update', { investigationId: investigation._id, status: 'qc_failed' });
      }

      return res.json({ success: true, message: 'Investigation marked as QC Failed', data: investigation });
    }

    if (Array.isArray(investigations)) {
      investigation.investigations = investigations;
    }

    if (isCritical) {
      investigation.status = 'critical_value';
      // Trigger critical alerts (push + WhatsApp)
      const consultant = await Consultant.findById(investigation.consultantId).populate('userId');
      if (consultant?.userId) {
        notificationService.notifyLabCriticalValue(consultant.userId, investigation.referralId).catch(console.error);
        const io = req.app.get('io');
        if (io) io.to(`consultant:${consultant._id}`).emit('lab_critical_value', { investigationId: investigation._id });
      }
    } else {
      investigation.status = 'awaiting_validation';
    }

    investigation.validationDate = new Date();
    await investigation.save();

    res.json({ success: true, message: 'Results validated', data: investigation });
  } catch (error) {
    console.error('validateResults error:', error);
    res.status(500).json({ success: false, message: 'Error validating results' });
  }
};

// Report Upload and Completion (Stage 6)
exports.uploadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reportFileUrl, billTotalPaisa } = req.body;

    const lab = await Laboratory.findOne({ userId: req.user.id });
    const investigation = await LabInvestigation.findOne({ _id: id, laboratoryId: lab._id }).populate('referralId');

    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Investigation not found' });
    }

    let finalReportUrl = reportFileUrl;

    if (!finalReportUrl) {
      if (investigation.investigations && investigation.investigations.length > 0) {
        const filename = `report-${investigation._id}.pdf`;
        const outputPath = path.join(__dirname, '../../uploads', filename);
        await generateLabReportPDF(investigation, investigation.referralId, lab, outputPath);
        finalReportUrl = `/uploads/${filename}`;
      } else {
        return res.status(400).json({ success: false, message: 'Report File URL is required or provide investigation results to auto-generate PDF' });
      }
    }

    const totalBill = billTotalPaisa || investigation.billTotalPaisa || 0;

    investigation.reportFileUrl = finalReportUrl;
    investigation.billTotalPaisa = totalBill;
    investigation.status = 'completed';
    investigation.completedAt = new Date();
    await investigation.save();

    // Close Referral
    const referral = await Referral.findById(investigation.referralId);
    if (referral) {
      referral.status = 'closed';
      referral.closedAt = new Date();
      await referral.save();
    }

    // Accrue weekly settlement payouts
    const consultant = await Consultant.findById(investigation.consultantId);
    if (consultant) {
      const deductionPercentage = lab.deductionPercentage || 20;
      const commissionPercentage = consultant.commissionPercentage || 60;

      const platformCutPaisa = Math.round(totalBill * (deductionPercentage / 100));
      const consultantSharePaisa = Math.round(platformCutPaisa * (commissionPercentage / 100));
      const adminSharePaisa = platformCutPaisa - consultantSharePaisa;

      await Payout.create({
        consultantId: consultant._id,
        referralId: referral._id,
        labInvestigationId: investigation._id,
        amountPaisa: consultantSharePaisa,
        totalBillPaisa: totalBill,
        deductionPercentage,
        platformCutPaisa,
        commissionPercentage,
        adminSharePaisa,
        status: 'accrued',
        note: `Lab Referral completed — Bill: ${totalBill/100} PKR (Lab cut: ${deductionPercentage}%, Consultant split: ${commissionPercentage}%)`,
      });

      console.log(`[LAB_BILLING] Accrued payout of ${consultantSharePaisa/100} PKR for Consultant ${consultant._id}`);
    }

    // Notify referring consultant
    const consultantUser = await User.findById(consultant.userId);
    if (consultantUser) {
      notificationService.notifyLabReportReady(consultantUser, referral, finalReportUrl).catch(console.error);
      const io = req.app.get('io');
      if (io) io.to(`consultant:${consultant._id}`).emit('lab_report_ready', { investigationId: investigation._id, reportUrl: finalReportUrl });
    }

    res.json({ success: true, message: 'Lab report uploaded and investigation finalized!', data: investigation });
  } catch (error) {
    console.error('uploadReport error:', error);
    res.status(500).json({ success: false, message: 'Error uploading report' });
  }
};

// List all lab investigations for the laboratory (Active workbench views)
exports.listMyInvestigations = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
    }

    const { status, section } = req.query;
    const filter = { laboratoryId: lab._id };
    if (status) filter.status = status;
    if (section) filter.section = section;

    const investigations = await LabInvestigation.find(filter)
      .populate('referralId')
      .populate({
        path: 'consultantId',
        select: 'userId specialty',
        populate: { path: 'userId', select: 'name phone email' }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: investigations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listing investigations' });
  }
};

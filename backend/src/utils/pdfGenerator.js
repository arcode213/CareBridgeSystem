const PDFDocument = require('pdfkit');
const fs = require('fs');

exports.generateLabReportPDF = async (investigation, referral, laboratory, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text(laboratory.laboratoryName || 'Laboratory Report', { align: 'center' });
      doc.moveDown();
      
      // Patient & Referral Info
      doc.fontSize(12).text(`Patient Name: ${referral.patientName}`);
      doc.text(`Age/Gender: ${referral.age} / ${referral.gender}`);
      doc.text(`Referral Code: ${referral.referralCode}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Results Table Header
      doc.fontSize(14).text('Investigation Results', { underline: true });
      doc.moveDown();

      if (investigation.investigations && investigation.investigations.length > 0) {
        investigation.investigations.forEach((inv) => {
          doc.fontSize(12).text(`${inv.testName}: ${inv.resultValue} (Ref: ${inv.referenceRange}) ${inv.isCritical ? '*** CRITICAL ***' : ''}`);
        });
      } else {
        doc.fontSize(12).text('No structured investigation results provided.');
      }

      doc.moveDown();
      doc.fontSize(10).text('This is an automatically generated report.', { align: 'center', color: 'grey' });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

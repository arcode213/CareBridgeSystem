// Force IPv4 DNS resolution to fix querySrv ECONNREFUSED on IPv6 networks
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const { Server } = require('socket.io');
const Hospital = require('./models/Hospital');
const Consultant = require('./models/Consultant');
const { processReferralEscalations } = require('./jobs/referralEscalation');
const { ensurePlatformData } = require('./bootstrap/ensurePlatformData');

// Load env vars
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // TODO: Update for production
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const referralRoutes = require('./routes/referralRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use('/v1/auth', authRoutes);
app.use('/v1/referrals', referralRoutes);
app.use('/v1/hospitals', hospitalRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/payments', paymentRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('CareBridge API is running');
});

// Socket.io — role rooms for targeted events
io.on('connection', (socket) => {
  socket.on('join_hospital', async ({ token } = {}) => {
    try {
      if (!token || !process.env.JWT_SECRET) return;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'hospital') return;
      const hospital = await Hospital.findOne({ userId: decoded.id });
      if (!hospital) return;
      socket.join(`hospital:${hospital._id.toString()}`);
    } catch (e) {
      console.warn('join_hospital:', e.message);
    }
  });

  socket.on('join_consultant', async ({ token } = {}) => {
    try {
      if (!token || !process.env.JWT_SECRET) return;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'consultant') return;
      const consultant = await Consultant.findOne({ userId: decoded.id });
      if (!consultant) return;
      socket.join(`consultant:${consultant._id.toString()}`);
    } catch (e) {
      console.warn('join_consultant:', e.message);
    }
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, { family: 4 })
  .then(async () => {
    console.log('MongoDB Connected');
    try {
      await ensurePlatformData();
      cron.schedule('* * * * *', () => {
        processReferralEscalations(io).catch((err) => console.error('referralEscalation', err));
      });
    } catch (err) {
      console.error('Startup initialization failed:', err);
      throw err;
    }
  })
  .catch((err) => console.error('MongoDB Connection Error:', err));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

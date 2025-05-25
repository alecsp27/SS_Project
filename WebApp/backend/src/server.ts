import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// 🔄 Import modele și rute
import { Device } from './models/device';
import authRoutes from './routes/auth';
import imageRoutes from './routes/image';
import deviceRoutes from './routes/deviceRoutes';
import authenticateToken from './middle/authenticateToken';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rute
app.use('/api/auth', authRoutes);
app.use('/api/images', authenticateToken, imageRoutes);
app.use('/api/devices', authenticateToken, deviceRoutes);

// Conectare la DB + cron job
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/imageDB');
    console.log('✅ Connected to MongoDB');

    // 🔁 Cron: marcheaza offline după 5 minute de inactivitate
    setInterval(async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      try {
        const result = await Device.updateMany(
          { lastSeen: { $lt: fiveMinAgo }, status: 'online' },
          { status: 'offline' }
        );

        if (result.modifiedCount > 0) {
          console.log(`🕐 ${result.modifiedCount} device(s) marked as offline`);
        }
      } catch (error) {
        console.error(' Error updating offline status:', error);
      }
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error(' MongoDB Connection Error:', error);
    process.exit(1);
  }
};

connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

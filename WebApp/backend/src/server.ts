import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import imageRoutes from './routes/image';
import deviceRoutes from './routes/deviceRoutes';
import authenticateToken from './middle/authenticateToken';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


const connectDB = async () => {
    try {
      await mongoose.connect('mongodb://localhost:27017/imageDB');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB Connection Error:', error);
      process.exit(1);
    }
  };

connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/images',authenticateToken, imageRoutes, deviceRoutes);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/imageDB')
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

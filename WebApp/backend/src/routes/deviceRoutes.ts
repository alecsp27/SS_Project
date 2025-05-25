import express from 'express';
import { Device } from '../models/device';
import { Image } from '../models/image';

const router = express.Router();

// 🔎 GET /api/devices - Listare dispozitive + ultima imagine
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find();
    const result = await Promise.all(
      devices.map(async (device) => {
        const lastImage = await Image.findOne({ device: device.deviceId }).sort({ timestamp: -1 });
        return {
          deviceId: device.deviceId,
          status: device.status,
          lastSeen: device.lastSeen,
          activeParams: device.activeParams,
          lastImage,
        };
      })
    );
    res.json(result);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

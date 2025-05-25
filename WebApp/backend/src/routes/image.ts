import express, { Request, Response } from 'express';
import { Image } from '../models/image';
import { Device } from '../models/device';

const router = express.Router();

// Save image metadata + update device status
router.post('/', async (req: Request, res: Response) => {
  try {
    const { timestamp, device, cameraParams, filePath } = req.body;

    // Creează o nouă imagine
    const newImage = new Image({
      timestamp,
      device,
      cameraParams,
      filePath,
    });

    // Salveaza imaginea in DB
    await newImage.save();

    // Actualizeaza starea dispozitivului
    await Device.findOneAndUpdate(
      { deviceId: device },
      {
        lastSeen: new Date(),
        status: 'online',
        activeParams: cameraParams,
      },
      { upsert: true, new: true }
    );

    res.status(201).send('Image saved & device updated');
  } catch (error) {
    console.error('Error saving image or updating device:', error);
    res.status(500).send('Error saving image');
  }
});

export default router;

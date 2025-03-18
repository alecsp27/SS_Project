import express, { Request, Response } from 'express';
import { Image } from '../models/image';

const router = express.Router();

// Save image metadata
router.post('/', async (req: Request, res: Response) => {
  const { timestamp, device, cameraParams, filePath } = req.body;

  const newImage = new Image({
    timestamp,
    device,
    cameraParams,
    filePath,
  });

  await newImage.save();
  res.status(201).send('Image saved');
});

export default router;

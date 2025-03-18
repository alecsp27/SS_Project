import mongoose, { Document, Schema } from 'mongoose';

interface IImage extends Document {
  timestamp: Date;
  device: string;
  cameraParams: object;
  filePath: string;
}

const imageSchema: Schema<IImage> = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    device: { type: String, required: true },
    cameraParams: { type: Schema.Types.Mixed, required: true },
    filePath: { type: String, required: true },
  },
  { timestamps: true }
);

const Image = mongoose.model<IImage>('Image', imageSchema);

export { Image, IImage };

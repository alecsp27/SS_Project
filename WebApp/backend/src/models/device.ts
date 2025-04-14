// src/models/device.ts
import mongoose, { Document, Schema } from 'mongoose';

interface IDevice extends Document {
  deviceId: string;
  lastSeen: Date;
  status: 'online' | 'offline';
  activeParams: object;
}

const deviceSchema: Schema<IDevice> = new Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    lastSeen: { type: Date, default: Date.now },
    status: { type: String, enum: ['online', 'offline'], default: 'offline' },
    activeParams: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Device = mongoose.model<IDevice>('Device', deviceSchema);
export { Device, IDevice };

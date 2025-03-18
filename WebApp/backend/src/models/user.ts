import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: 'admin' | 'operator' | 'viewer';
}

const userSchema: Schema<IUser> = new Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'operator', 'viewer'], required: true },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>('User', userSchema);

export { User, IUser };

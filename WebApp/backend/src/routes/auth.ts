import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';

const router = express.Router();

// Register a user
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  console.log('📩 Received register request:', { username, role });

  if (!['admin', 'operator', 'viewer'].includes(role)) {
    console.log('❌ Invalid role');
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, passwordHash: hashedPassword, role });
    console.log(newUser);
    const savedUser = await newUser.save();
    console.log('✅ User saved to MongoDB:', savedUser);

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('❌ Error saving user:', err);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // ✅ Fetch user from MongoDB
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // ✅ Compare hashed password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // ✅ Generate token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
export default router;

import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';

const router = express.Router();

const mockUsers = [
    {
      id: '123',
      username: 'testuser',
      password: bcrypt.hashSync('password123', 10), // Hashed password
      role: 'admin',
    },
  ];
// Register a user
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, passwordHash: hashedPassword, role });

  await newUser.save();
  res.status(201).send('User created');
});

router.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
  
      // Find user in mock database
      const user = mockUsers.find(u => u.username === username);
      if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });
  
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' }
      );
  
      console.log(res.json({ token }));
    } catch (error) {
      console.log(res.status(500).json({ error: 'Internal server error' }));
    }
  });

export default router;

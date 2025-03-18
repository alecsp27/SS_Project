import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock user database (instead of a real DB query)
// Mock users (passwords should be hashed in a real DB)
const mockUsers = [
    {
      id: '123',
      username: 'testuser',
      password: bcrypt.hashSync('password123', 10), // Hashed password
      role: 'admin',
    },
  ];

// Extend Express Request type to include `user`
interface AuthenticatedRequest extends Request {
  user?: JwtPayload; // You can replace `any` with a specific user type if needed
}

// const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   const token = req.header('Authorization')?.split(' ')[1];

//   if (!token) {
//     return res.status(401).send('Access denied');
//   }

//   jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
//     if (err) return res.status(403).send('Invalid token');
    
//     req.user = user;  // ✅ Now TypeScript recognizes `req.user`
//     next();
//   });
// };

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = req.header('Authorization')?.split(' ')[1];
  
    if (!token) {
      res.status(401).send('Access denied');
      return; // ✅ Ensures function exits
    }
  
    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
      if (err) {
        res.status(403).send('Invalid token');
        return; // ✅ Ensures function exits
      }
  
      const user = decoded as JwtPayload;
      if (!user.username) {
        res.status(403).send('Invalid token structure');
        return; // ✅ Ensures function exits
      }
  
      // Check if user exists
      const foundUser = mockUsers.find(u => u.username === user.username);
      if (!foundUser) {
        res.status(403).send('User not found');
        return; // ✅ Ensures function exits
      }
  
      req.user = foundUser;
      next(); // ✅ Ensures next middleware runs
    });
  };

export default authenticateToken;

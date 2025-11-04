const jwt = require('jsonwebtoken');

// Mock user data for demo purposes
const mockUsers = [
  {
    id: 'user1',
    email: 'demo@example.com',
    name: 'Demo User',
    isAdmin: false,
    preferences: {
      language: 'en',
      alertMode: 'voice',
      voiceEnabled: true
    }
  },
  {
    id: 'admin1',
    email: 'admin@example.com',
    name: 'Admin User',
    isAdmin: true,
    preferences: {
      language: 'en',
      alertMode: 'all',
      voiceEnabled: true
    }
  }
];

// Simple authentication middleware (for demo purposes)
const authenticateUser = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // For demo purposes, use a default user if no token
      req.user = mockUsers[0];
      return next();
    }

    // In a real app, verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
    const user = mockUsers.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // For demo purposes, use default user on auth failure
    req.user = mockUsers[0];
    next();
  }
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
      const user = mockUsers.find(u => u.id === decoded.userId);
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Generate JWT token (for demo purposes)
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'demo-secret',
    { expiresIn: '7d' }
  );
};

// Mock login function
const mockLogin = (email, password) => {
  const user = mockUsers.find(u => u.email === email);
  if (user && password === 'demo123') { // Simple demo password
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        preferences: user.preferences
      },
      token: generateToken(user.id)
    };
  }
  return null;
};

module.exports = {
  authenticateUser,
  requireAdmin,
  optionalAuth,
  generateToken,
  mockLogin,
  mockUsers
};

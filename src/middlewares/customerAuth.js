const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/userRegisterModel');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'No token provided or invalid format',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not found',
      });
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Token no longer valid. Please login again.',
      });
    }

    req.userInfo = {
      userId: user._id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (error) {
    const msg =
      error.name === 'TokenExpiredError'
        ? 'Token has expired'
        : 'Invalid token';

    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: msg,
    });
  }
};

module.exports = authMiddleware;
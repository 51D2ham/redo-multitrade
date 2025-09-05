const jwt = require('jsonwebtoken');
const User = require('../models/userRegisterModel');
const Admin = require('../models/adminRegister');

// Admin authorization middleware
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin authentication required' 
      });
    }

    const admin = await Admin.findById(req.session.admin._id);
    if (!admin || admin.status !== 'active') {
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        message: 'Admin account not found or inactive' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authorization failed' 
    });
  }
};

// Customer authorization middleware
const requireCustomer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({ 
        success: false, 
        message: 'User account not found or inactive' 
      });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been invalidated' 
      });
    }

    req.user = user;
    req.userInfo = decoded;
    next();
  } catch (error) {
    console.error('Customer authorization error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Resource ownership check
const requireOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({ 
          success: false, 
          message: 'Resource not found' 
        });
      }

      // Check if user owns the resource
      const userId = req.user?._id || req.userInfo?.userId;
      if (resource.user?.toString() !== userId?.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: insufficient permissions' 
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Authorization check failed' 
      });
    }
  };
};

// Admin ownership check for admin-created resources
const requireAdminOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({ 
          success: false, 
          message: 'Resource not found' 
        });
      }

      // Check if admin owns the resource or is super admin
      const adminId = req.admin?._id || req.session?.admin?._id;
      if (resource.admin?.toString() !== adminId?.toString() && req.admin?.role !== 'superadmin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: insufficient permissions' 
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Admin ownership check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Authorization check failed' 
      });
    }
  };
};

module.exports = {
  requireAdmin,
  requireCustomer,
  requireOwnership,
  requireAdminOwnership
};
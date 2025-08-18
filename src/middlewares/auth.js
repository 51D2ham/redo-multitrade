const Admin = require('../models/adminRegister');

module.exports = async (req, res, next) => {
  try {
    if (!req.session.admin) {
      req.flash('error', 'Please log in to continue');
      return res.redirect('/admin/v1/staff/login');
    }
    const expires = req.session.cookie._expires; 
    if (expires && new Date(expires) < new Date()) {
      req.flash('error', 'Session expired. Please log in again.');
      return req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.clearCookie('ecom.sid');
        return res.redirect('/admin/v1/staff/login');
      });
    }
    const { ip: savedIp, userAgent: savedUA } = req.session;
    const currentIp = req.ip;
    const currentUA = req.headers['user-agent'];

    const strictIPCheck = process.env.NODE_ENV === 'production';
    if ((strictIPCheck && savedIp && savedIp !== currentIp) || (savedUA && savedUA !== currentUA)) {
      console.warn(`Session hijack attempt detected for admin ${req.session.admin.id}`);
      req.flash('error', 'Security alert: Session validation failed');
      return req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.clearCookie('ecom.sid');
        return res.redirect('/admin/v1/staff/login');
      });
    }
    if (!savedIp) req.session.ip = currentIp;
    if (!savedUA) req.session.userAgent = currentUA;

    const admin = await Admin.findById(req.session.admin.id)
      .select('-password') 
      .lean();

    if (!admin) {
      req.flash('error', 'Admin account not found');
      return req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.clearCookie('ecom.sid');
        return res.redirect('/admin/v1/staff/login');
      });
    }

  const crypto = require('crypto');
  const nonce = crypto.randomBytes(16).toString('base64');
  
  // Permissive CSP for development
  const csp = [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net"
  ].join('; ');

  res.set({
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff'
  });
  
  res.locals.cspNonce = nonce;
    req.admin = admin;
    req.user = admin; // For compatibility with existing controllers
    next();

  } catch (err) {
    console.error('Admin Auth Middleware Error:', err);
    req.flash('error', 'Authentication system error');
    res.redirect('/admin/v1/staff/login');
  }
};
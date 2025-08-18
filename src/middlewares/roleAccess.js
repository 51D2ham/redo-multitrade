const authorizedRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const admin = req.admin;

      if (!admin || !admin.role) {
        req.flash('error', 'Unauthorized: Please log in');
        req.session.save(() => {
          return res.redirect('/admin/v1/staff/login');
        });
        return;
      }

      //  roles
      const userRole = admin.role.toLowerCase();
      const allowed = allowedRoles.map(role => role.toLowerCase());

      if (!allowed.includes(userRole)) {
        req.flash('error', "You do not have permission for this action");
        req.session.save(() => {
          return res.redirect('/admin/v1/staff/dashboard');
        });
        return;
      }

      // Authorized
      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      req.flash('error', 'Something went wrong, please try again');
      req.session.save(() => {
        return res.redirect('/admin/v1/staff/dashboard');
      });
    }
  };
};

module.exports = authorizedRole;
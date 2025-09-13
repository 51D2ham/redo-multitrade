const express = require('express');
const router = express.Router();

// Debug route to check CSRF token
router.get('/csrf-debug', (req, res) => {
  res.json({
    sessionExists: !!req.session,
    sessionToken: req.session?.csrfToken,
    localsToken: res.locals.csrfToken,
    sessionId: req.session?.id,
    admin: !!req.session?.admin
  });
});

module.exports = router;
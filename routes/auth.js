const express = require('express');
const router = express.Router();
const passport = require('passport');

// Route to initiate Google sign-in
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback route after successful authentication
// Google callback route after successful authentication
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication
    req.session.user = req.user;  // Store the user in session
    res.redirect('/user/home');   // Redirect to home or dashboard
  }
);



module.exports = router;

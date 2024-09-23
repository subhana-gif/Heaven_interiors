const express = require('express');
const router = express.Router();
const passport = require('passport');

// Route to initiate Google sign-in
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback route after successful authentication
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to the homepage or dashboard.
    res.redirect('/user/home');  }
);



module.exports = router;

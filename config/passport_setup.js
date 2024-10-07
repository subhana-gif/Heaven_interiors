require('dotenv').config(); // Ensure dotenv is loaded

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    scope: ['profile', 'email']
},
async function(accessToken, refreshToken, profile, done) {
    const email = profile.emails[0].value;
    const googleId = profile.id;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                email,
                provider: 'google',
                googleId,
                username: profile.displayName // Optionally store display name from Google
            });
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

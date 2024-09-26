const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define User Schema
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String }, // Not required for Google users
    password: { type: String }, // Not required for Google users
    isBlocked: { type: Boolean, default: false },
    provider: { type: String, default: 'local' }, // 'local' for traditional, 'google' for OAuth
    googleId: { type: String } // To store Google ID for OAuth users
});

// Hash password before saving (only if password exists)
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false; // No password set for OAuth users
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema);
module.exports = User;

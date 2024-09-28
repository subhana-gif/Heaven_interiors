
const bcrypt = require('bcrypt');
const User = require('../models/User'); 

const authenticate = async (email, password) => {
  try {
    const user = await User.findOne({ email });
    if (!user) return false;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

module.exports = {
  authenticate
};

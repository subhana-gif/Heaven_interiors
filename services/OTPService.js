const crypto = require('crypto');

function generateOTP(email) {
  const otp = crypto.randomInt(100000, 999999); 
  return otp;
}

function verifyOTP(email, otp) {
  return true;
}

module.exports = {
  generateOTP,
  verifyOTP
};

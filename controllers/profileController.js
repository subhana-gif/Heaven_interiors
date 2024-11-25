const User = require('../models/User');
const Address = require('../models/Address');
const bcrypt = require('bcrypt');

exports.renderProfile = (req, res) => {
    res.render('userSide/profile', { body: 'userSide/personalInfo', selectedView:'personalInfo' }); // Default profile page with no content
  };
  

  exports.getPersonalInfo = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).send('User not found');
  
      res.render('userSide/profile', {
        body: 'userSide/personalInfo',
        selectedView: 'personalInfo',
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  };
  
  exports.getAddressManagement = async (req, res) => {
    try {
      const addresses = await Address.find({ userId: req.user._id });
  
      res.render('userSide/profile', {
        body: 'userSide/address',
        selectedView: 'address', 
        addresses,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  };
  
  exports.updatePersonalInfo = async (req, res) => {
      const { username, oldPassword, newPassword } = req.body;
      const userId = req.session.user._id;
  
      try {
          const user = await User.findById(userId);
  
          if (!user) {
              return res.status(404).json({
                  success: false,
                  field: 'general',
                  message: 'User not found',
              });
          }
  
          // Update username if provided and different
          if (username && username !== user.username) {
              user.username = username;
          }
  
          // If updating the password, validate the old password
          if (newPassword) {
              if (!oldPassword) {
                  return res.status(400).json({
                      success: false,
                      field: 'oldPassword',
                      message: 'Old password is required to change the password',
                  });
              }
  
              const isMatch = await bcrypt.compare(oldPassword, user.password);
              if (!isMatch) {
                  return res.status(400).json({
                      success: false,
                      field: 'oldPassword',
                      message: 'Old password is incorrect',
                  });
              }
  
              user.password = newPassword
          }
  
          // Save updated user
          await user.save();
  
          res.json({
              success: true,
              message: 'Personal information updated successfully',
          });
      } catch (error) {
          console.error('Error during personal info update:', error); // Log unexpected errors
          res.status(500).json({
              success: false,
              field: 'general',
              message: 'An error occurred. Please try again later.',
          });
      }
  };


// Add Address
exports.addAddress = async (req, res) => {
    try {
        const { name, mobileNumber, city, state, pinCode } = req.body;
  
        // Create new address
        const newAddress = new Address({
            userId: req.user._id, // Assuming the user is authenticated
            name,
            mobileNumber,
            city,
            state,
            pinCode
        });
  
        await newAddress.save();
  
        res.status(201).json({ success: true, message: 'Address added successfully' });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ success: false, message: 'Failed to add address' });
    }
  };
  
exports.getAddress = async (req, res) => {
      try {
          const address = await Address.findById(req.params.id).exec();
          if (address) {
              res.json({ success: true, address });
          } else {
              res.json({ success: false, message: 'Address not found' });
          }
      } catch (error) {
          console.error(error);
          res.json({ success: false, message: 'Error fetching address' });
      }
};

// Edit Address
exports.editAddress = async (req, res) => {
  try {
      const { addressId } = req.params;
      const { name, mobileNumber, city, state, pinCode } = req.body;

      // Validation logic
      if (!name || !mobileNumber || !city || !state || !pinCode) {
          return res.status(400).json({ success: false, message: 'All fields are required.' });
      }

      // Example validation for mobile number and pin code
      const mobileRegex = /^[6-9]\d{9}$/;
      const pinCodeRegex = /^\d{6}$/;

      if (!mobileRegex.test(mobileNumber)) {
          return res.status(400).json({ success: false, message: 'Invalid mobile number.' });
      }

      if (!pinCodeRegex.test(pinCode)) {
          return res.status(400).json({ success: false, message: 'Invalid pin code.' });
      }

      // Update the address in the database
      const updatedAddress = await Address.findByIdAndUpdate(
          addressId,
          { name, mobileNumber, city, state, pinCode },
          { new: true }
      );

      if (!updatedAddress) {
          return res.status(404).json({ success: false, message: 'Address not found.' });
      }

      res.json({ success: true, message: 'Address updated successfully!', address: updatedAddress });
  } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

exports.deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;  // Read addressId from URL params
  
        // Find and delete the address
        const deletedAddress = await Address.findByIdAndDelete(addressId);
  
        if (!deletedAddress) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
  
        res.status(200).json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
};
  


    
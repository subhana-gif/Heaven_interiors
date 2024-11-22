const User = require('../models/User');
const Address = require('../models/Address');

exports.renderProfile = (req, res) => {
    res.render('userSide/profile', { body: 'userSide/personalInfo', selectedView:'' }); // Default profile page with no content
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
  
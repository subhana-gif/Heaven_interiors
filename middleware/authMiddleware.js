const isAdminAuthenticated = (req, res, next) =>{
  
  if (req.session.isAdmin) {
      return next();
  } else {
      return res.redirect('/adminPanel/login');
  }
};

module.exports = {
  isAdminAuthenticated
};

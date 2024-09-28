const isAdminAuthenticated = (req, res, next) =>{
  console.log('admin:',req.session.isAdmin);
  
  if (req.session.isAdmin) {
      return next();
  } else {
      return res.redirect('/adminPanel/login');
  }
};

module.exports = {
  isAdminAuthenticated
};

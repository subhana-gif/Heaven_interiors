exports.renderSettingsPage = (req, res) => {
    res.render('admin/settings');  
};

exports.updateSettings = (req, res) => {
    const { siteName, siteEmail, sitePhone, siteDescription } = req.body;

    req.flash('success_msg', 'Settings updated successfully!'); 
    res.redirect('/adminPanel/settings'); 
};

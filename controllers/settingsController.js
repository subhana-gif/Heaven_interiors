exports.renderSettingsPage = (req, res) => {
    res.render('admin/settings');  
};

exports.updateSettings = (req, res) => {
    // Handle form submission, validate, and save settings here
    const { siteName, siteEmail, sitePhone, siteDescription } = req.body;

    // Process file upload for siteLogo if provided (you can use multer for this)
    // Save the settings in your database

    req.flash('success_msg', 'Settings updated successfully!'); // If using connect-flash for messages
    res.redirect('/adminPanel/settings'); // Redirect back to settings page
};

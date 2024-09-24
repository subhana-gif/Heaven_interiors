const multer = require('multer');
const path = require('path');

// Define storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');  // Make sure the directory exists
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Multer configuration without file type checking
const upload = multer({
    storage: storage,
});

module.exports = upload;

const multer = require('multer');
const path = require('path');

// Define storage for uploaded files
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');  // Make sure the directory 'uploads/' exists or create it
    },
    
    
    filename: function(req, file, cb) {
        console.log(file,"lll");
        
        // Save the file with its original extension and a unique timestamp
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Multer configuration
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },  // Optional: Limit file size to 5MB per image
}).array('images', 10);  // Accept up to 3 images

module.exports = upload;

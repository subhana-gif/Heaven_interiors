const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport'); // Require passport here
const path=require('path')
require('./config/passport_setup');

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes'); 
const offerRoutes = require('./routes/offerRoutes'); 
const settingRoutes = require('./routes/settingRoutes');
const userRoutes = require('./routes/userRoutes') 
const authRoutes = require('./routes/auth'); 
const otpRoutes = require('./routes/otpRoutes');
const homeRoutes = require('./routes/homeRoutes');
const userProductRoutes = require('./routes/userProductRoutes');
// Load environment variables from .env file
dotenv.config();

// Initialize the app
const app = express();

// Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecretKey', // Use environment variable for security
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

dotenv.config();


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static("uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public')); // Serve static files
app.set('view engine', 'ejs'); // Set view engine to EJS

// Passport configuration
require('./config/passport_setup');
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected...'))
.catch(err => console.error('MongoDB connection error:', err));

// adminRoutes
app.use('/adminPanel', adminRoutes);
app.use('/adminPanel', categoryRoutes);
app.use('/adminPanel', customerRoutes);
app.use('/adminPanel', productRoutes);
app.use('/adminPanel', orderRoutes)
app.use('/adminPanel', offerRoutes);
app.use('/adminPanel', settingRoutes);

// userRoues
app.use('/auth', authRoutes);
app.use('/user',userRoutes);
app.use('/user', otpRoutes);
app.use('/user', homeRoutes);
app.use('/user', userProductRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');

//  const path=require('path')
// const morgan=require('morgan')

require('./config/passport_setup');

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const offerRoutes = require('./routes/offerRoutes'); 
const settingRoutes = require('./routes/settingRoutes');
const userRoutes = require('./routes/userRoutes') 
const authRoutes = require('./routes/auth'); 
const otpRoutes = require('./routes/otpRoutes');
const homeRoutes = require('./routes/homeRoutes');
const userProductRoutes = require('./routes/userProductRoutes');
const cartRoutes=require('./routes/cartRoutes')
const checkoutRoutes=require('./routes/checkoutRoutes')
const orderRoutes=require('./routes/orderRoutes')
const orderAdminRoutes=require('./routes/orderAdminRoutes')
const profilRoutes=require('./routes/profileRoutes')
const searchRoutes=require('./routes/searchRoutes')

const nocache = require('nocache');
dotenv.config();

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecretKey', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

dotenv.config();
app.use(nocache())


app.use('/uploads', express.static('uploads'));
app.use(express.static("uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.set('view engine', 'ejs'); 


// Passport configuration
require('./config/passport_setup');
app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
  res.locals.user = req.session.user || null;  // user will be available globally in views
  next();
});


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
app.use('/adminPanel', orderAdminRoutes)
app.use('/adminPanel', offerRoutes);
app.use('/adminPanel', settingRoutes);

// userRoues
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/user', otpRoutes);
app.use('/user', homeRoutes);
app.use('/user', userProductRoutes);
app.use('/user', cartRoutes)
app.use('/user', checkoutRoutes)
app.use('/user', orderRoutes)
app.use('/user', profilRoutes)
app.use('/user', searchRoutes)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

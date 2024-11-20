const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const routes=require('./routes/routes')
const MongoStore = require('connect-mongo');


require('./config/passport_setup');

const nocache = require('nocache');
dotenv.config();

const app = express();


app.use(
  session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60
    }
  })
);

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
  res.locals.user = req.session.user || null; 
  next();
});


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected...'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(routes)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

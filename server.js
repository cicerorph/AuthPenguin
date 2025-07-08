require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

// Import configurations
const { connectRedis } = require('./src/config/database');
const configurePassport = require('./src/config/passport');

// Import middleware
const { 
    checkOrigin, 
    rateLimit,
    storeProjectInfo
} = require('./src/middleware/auth');

// Import routes
const authRoutes = require('./src/routes/auth');
const oauthRoutes = require('./src/routes/oauth');
const scratchRoutes = require('./src/routes/scratch');
const soundcloudRoutes = require('./src/routes/soundcloud');
const adminRoutes = require('./src/routes/admin');

const app = express();

// Connect to Redis
connectRedis();

// Configure Passport
configurePassport();

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/', express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Static page routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/terms.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/privacy.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/blocked.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/blocked.html'));
});

// Apply security middleware to auth routes
app.use('/auth', rateLimit(100, 60000)); // 100 requests per minute
app.use('/auth', storeProjectInfo); // Store project info in session for pop-ups
app.use('/auth', checkOrigin);

// Routes
app.use('/auth', authRoutes);
app.use('/auth', oauthRoutes);
app.use('/auth', scratchRoutes);
app.use('/auth', soundcloudRoutes);

// Admin routes (separate from auth middleware)
app.use('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AuthPenguin server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    process.exit(0);
});

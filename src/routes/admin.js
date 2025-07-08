const express = require('express');
const { 
    blockProject, 
    unblockProject, 
    blockOrigin,
    unblockOrigin,
    listBlockedProjects, 
    checkProjectStatus 
} = require('../utils/admin');
const { rateLimit } = require('../middleware/auth');
const router = express.Router();

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.body.adminKey;
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
};

// Apply rate limiting to admin routes
router.use(rateLimit(10, 60000)); // 10 requests per minute

// Block a project
router.post('/block', adminAuth, blockProject);

// Unblock a project
router.post('/unblock', adminAuth, unblockProject);

// Block an origin
router.post('/block-origin', adminAuth, blockOrigin);

// Unblock an origin
router.post('/unblock-origin', adminAuth, unblockOrigin);

// List blocked projects
router.get('/blocked', adminAuth, listBlockedProjects);

// Check project status (public endpoint with rate limiting)
router.get('/status', rateLimit(30, 60000), checkProjectStatus);

module.exports = router;

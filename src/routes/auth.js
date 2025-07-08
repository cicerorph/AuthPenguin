const express = require('express');
const path = require('path');
const { requireAuth, checkProjectBlockedAndRedirect } = require('../middleware/auth');
const { redisClient } = require('../config/database');
const router = express.Router();

// OAuth provider selector (with block check)
router.get('/selector', checkProjectBlockedAndRedirect, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/auth-selector.html'));
});

// Check authentication status
router.get('/status', requireAuth, async (req, res) => {
    res.json(req.user);
});

// Logout
router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;
    if (token) {
        try {
            await redisClient.del(`auth:${token}`);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    } else {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Authentication failure
router.get('/failure', (req, res) => {
    res.send(`<script>
        window.opener.postMessage({type: 'AUTH_FAILURE', error: 'Authentication failed'}, '*');
        window.close();
    </script>`);
});

module.exports = router;

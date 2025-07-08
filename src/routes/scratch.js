const express = require('express');
const path = require('path');
const { storeUserData, checkProjectBlockedAndRedirect } = require('../middleware/auth');
const router = express.Router();

// In-memory code store for Scratch verification
const scratchCodes = new Map();

// Scratch authentication page (with block check)
router.get('/scratch', checkProjectBlockedAndRedirect, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/scratch-auth.html'));
});

// Generate Scratch verification code
router.post('/scratch/generate', (req, res) => {
    const randomCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const code = `AUTHPENGUIN_${randomCode}`;
    const timestamp = Date.now();
    
    scratchCodes.set(code, { timestamp, used: false });
    
    // Clean up old codes (older than 10 minutes)
    for (const [key, value] of scratchCodes.entries()) {
        if (timestamp - value.timestamp > 600000) {
            scratchCodes.delete(key);
        }
    }
    
    res.json({ code });
});

// Verify Scratch code
router.post('/scratch/verify', async (req, res) => {
    const { code, username } = req.body;
    
    try {
        const codeData = scratchCodes.get(code);
        
        if (!codeData) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        if (codeData.used) {
            return res.status(400).json({ error: 'Code already used' });
        }

        if (Date.now() - codeData.timestamp > 600000) {
            scratchCodes.delete(code);
            return res.status(400).json({ error: 'Code expired' });
        }

        // Fetch user data from Scratch API
        const userResponse = await fetch(`https://api.scratch.mit.edu/users/${username}`);
        if (!userResponse.ok) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = await userResponse.json();

        // Check user's profile comments for the code using the new API
        const commentsResponse = await fetch(`https://api.mubilop.tech/api/v1/scratch/comments/user/${username}`);
        if (!commentsResponse.ok) {
            return res.status(500).json({ error: 'Failed to fetch comments' });
        }

        const commentsData = await commentsResponse.json();
        const hasCode = commentsData.comments.some(comment => 
            comment.content.includes(code) && comment.user === username
        );

        if (!hasCode) {
            return res.status(400).json({ 
                error: 'Code not found in profile comments',
                instructions: 'Please post the code as a comment on your Scratch profile'
            });
        }

        codeData.used = true;
        
        const user = {
            id: userData.id,
            username: userData.username,
            displayName: userData.username,
            avatar: userData.profile.images['90x90'],
            email: null,
            provider: 'scratch',
            scratch: {
                avatars: userData.profile.images,
                scratchteam: userData.scratchteam,
                joined: userData.history.joined,
                status: userData.profile.status,
                bio: userData.profile.bio,
                country: userData.profile.country
            }
        };
        
        const token = await storeUserData(user);
        res.json({ success: true, token });
        
    } catch (error) {
        console.error('Scratch verification error:', error);
        res.status(500).json({ error: 'Server error during verification' });
    }
});

module.exports = router;

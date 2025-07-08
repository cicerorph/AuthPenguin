const crypto = require('crypto');

// In-memory code store for Scratch verification
const scratchCodes = new Map();

const ScratchStrategy = function(options, verify) {
    this.name = 'scratch';
    this._verify = verify;
};

ScratchStrategy.prototype.authenticate = function(req, options) {
    if (req.query.code && req.query.username) {
        this.verifyCode(req.query.code, req.query.username, req);
    } else {
        this.generateCode(req);
    }
};

ScratchStrategy.prototype.generateCode = function(req) {
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
    
    req.res.json({ 
        code, 
        message: 'Please comment this code on your Scratch profile and then verify',
        instructions: 'Go to your Scratch profile and post a comment with exactly this code, then come back and verify.'
    });
};

ScratchStrategy.prototype.verifyCode = async function(code, username, req) {
    try {
        const codeData = scratchCodes.get(code);
        
        if (!codeData) {
            return req.res.status(400).json({ error: 'Invalid or expired code' });
        }

        if (codeData.used) {
            return req.res.status(400).json({ error: 'Code already used' });
        }

        if (Date.now() - codeData.timestamp > 600000) {
            scratchCodes.delete(code);
            return req.res.status(400).json({ error: 'Code expired' });
        }

        // Fetch user data from Scratch API
        const userResponse = await fetch(`https://api.scratch.mit.edu/users/${username}`);
        if (!userResponse.ok) {
            return req.res.status(404).json({ error: 'User not found' });
        }

        const userData = await userResponse.json();

        // Check user's profile comments for the code
        const commentsResponse = await fetch(`https://api.scratch.mit.edu/users/${username}/comments`);
        if (!commentsResponse.ok) {
            return req.res.status(500).json({ error: 'Failed to fetch comments' });
        }

        const comments = await commentsResponse.json();
        const hasCode = comments.some(comment => 
            comment.content.includes(code) && comment.author.username === username
        );

        if (!hasCode) {
            return req.res.status(400).json({ 
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

        this._verify(null, null, user, (err, user) => {
            if (err) {
                return req.res.status(500).json({ error: 'Authentication failed' });
            }
            req.user = user;
            req.res.json({ success: true, user });
        });

    } catch (error) {
        console.error('Scratch verification error:', error);
        req.res.status(500).json({ error: 'Server error during verification' });
    }
};

module.exports = ScratchStrategy;

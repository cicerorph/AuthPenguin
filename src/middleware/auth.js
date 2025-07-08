const { redisClient } = require('../config/database');
const crypto = require('crypto');

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const userData = await redisClient.get(`auth:${token}`);
        if (!userData) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        req.user = JSON.parse(userData);
        req.authToken = token;
        
        // Store project info in session if provided in query params
        if (req.query.projectId) {
            req.session.projectId = req.query.projectId;
        }
        
        next();
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Middleware to store project information in session for pop-up authentication
 */
const storeProjectInfo = (req, res, next) => {
    // Store project ID and origin in session for pop-up based auth
    if (req.query.projectId) {
        req.session.projectId = req.query.projectId;
    }
    if (req.query.origin) {
        req.session.origin = req.query.origin;
    }
    // Also store referrer as fallback origin
    if (req.headers.referer && !req.session.origin) {
        req.session.origin = req.headers.referer;
    }
    next();
};

/**
 * Middleware to check if request is from allowed origin
 */
const checkOrigin = (req, res, next) => {
    next();
};

/**
 * Middleware to check if project is blocked and redirect to blocked page
 */
const checkProjectBlockedAndRedirect = async (req, res, next) => {
    // For pop-up based authentication, get project ID from query params or session
    const projectId = req.query.projectId || req.session.projectId;
    const origin = req.query.origin || req.session.origin || req.headers.referer;

    if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
    }

    try {
        // Check if origin is blocked
        if (origin) {
            const originHost = new URL(origin).hostname;
            const originBlocked = await redisClient.get(`blocked:origin:${originHost}`);
            if (originBlocked) {
                const blockData = JSON.parse(originBlocked);
                const params = new URLSearchParams({
                    projectId: originHost,
                    reason: blockData.reason || 'No reason provided',
                    blockedAt: blockData.timestamp,
                    type: 'origin'
                });
                return res.redirect(`/blocked.html?${params}`);
            }
        }

        // Check if project is blocked
        const blocked = await redisClient.get(`blocked:${projectId}`);
        if (blocked) {
            const blockData = JSON.parse(blocked);
            const params = new URLSearchParams({
                projectId: projectId,
                reason: blockData.reason || 'No reason provided',
                blockedAt: blockData.timestamp,
                type: 'project'
            });
            return res.redirect(`/blocked.html?${params}`);
        }

        // Check if shared project URL is blocked
        if (origin && origin.includes('penguinmod.com')) {
            const urlMatch = origin.match(/#(\d+)/);
            if (urlMatch) {
                const sharedProjectId = urlMatch[1];
                const sharedBlocked = await redisClient.get(`blocked:shared:${sharedProjectId}`);
                if (sharedBlocked) {
                    const blockData = JSON.parse(sharedBlocked);
                    const params = new URLSearchParams({
                        projectId: sharedProjectId,
                        reason: blockData.reason || 'No reason provided',
                        blockedAt: blockData.timestamp,
                        type: 'shared'
                    });
                    return res.redirect(`/blocked.html?${params}`);
                }
            }
        }

        next();
    } catch (error) {
        console.error('Project block check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Middleware to check if project is blocked
 */
const checkProjectBlocked = async (req, res, next) => {
    // For pop-up based authentication, get project ID from query params or session
    const projectId = req.query.projectId || req.session.projectId;
    const origin = req.query.origin || req.session.origin || req.headers.referer;

    if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
    }

    try {
        // Check if project is blocked
        const blocked = await redisClient.get(`blocked:${projectId}`);
        if (blocked) {
            const blockData = JSON.parse(blocked);
            return res.status(403).json({ 
                error: 'Project blocked from using OAuth system',
                reason: blockData.reason || 'No reason provided',
                blockedAt: blockData.timestamp
            });
        }

        // Check if shared project URL is blocked
        if (origin && origin.includes('penguinmod.com')) {
            const urlMatch = origin.match(/#(\d+)/);
            if (urlMatch) {
                const sharedProjectId = urlMatch[1];
                const sharedBlocked = await redisClient.get(`blocked:shared:${sharedProjectId}`);
                if (sharedBlocked) {
                    const blockData = JSON.parse(sharedBlocked);
                    return res.status(403).json({ 
                        error: 'Shared project blocked from using OAuth system',
                        reason: blockData.reason || 'No reason provided',
                        blockedAt: blockData.timestamp
                    });
                }
            }
        }

        next();
    } catch (error) {
        console.error('Project block check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Rate limiting middleware
 */
const rateLimit = (maxRequests = 60, windowMs = 60000) => {
    return async (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `rate:${ip}`;

        try {
            const current = await redisClient.incr(key);
            if (current === 1) {
                await redisClient.expire(key, Math.floor(windowMs / 1000));
            }

            if (current > maxRequests) {
                return res.status(429).json({ 
                    error: 'Too many requests',
                    retryAfter: Math.floor(windowMs / 1000)
                });
            }

            next();
        } catch (error) {
            console.error('Rate limit error:', error);
            next(); // Continue on error
        }
    };
};

/**
 * Generate secure token
 */
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Store user data with token
 */
const storeUserData = async (userData) => {
    const token = generateToken();
    await redisClient.setEx(`auth:${token}`, 86400, JSON.stringify(userData)); // 24 hours
    return token;
};

module.exports = {
    requireAuth,
    storeProjectInfo,
    checkOrigin,
    checkProjectBlocked,
    checkProjectBlockedAndRedirect,
    rateLimit,
    generateToken,
    storeUserData
};

const { redisClient } = require('../config/database');

/**
 * Block a project from using OAuth
 */
const blockProject = async (req, res) => {
    const { projectId, reason, type = 'project' } = req.body;
    
    if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
    }

    try {
        const blockData = {
            reason: reason || 'No reason provided',
            timestamp: new Date().toISOString(),
            type
        };

        const key = type === 'shared' ? `blocked:shared:${projectId}` : `blocked:${projectId}`;
        await redisClient.set(key, JSON.stringify(blockData));

        res.json({ 
            success: true, 
            message: `Project ${projectId} blocked successfully`,
            type
        });
    } catch (error) {
        console.error('Block project error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Block an origin/website from using OAuth
 */
const blockOrigin = async (req, res) => {
    const { origin, reason } = req.body;
    
    if (!origin) {
        return res.status(400).json({ error: 'Origin required' });
    }

    try {
        const blockData = {
            reason: reason || 'No reason provided',
            timestamp: new Date().toISOString(),
            type: 'origin'
        };

        await redisClient.set(`blocked:origin:${origin}`, JSON.stringify(blockData));

        res.json({ 
            success: true, 
            message: `Origin ${origin} blocked successfully`
        });
    } catch (error) {
        console.error('Block origin error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Unblock an origin/website
 */
const unblockOrigin = async (req, res) => {
    const { origin } = req.body;
    
    if (!origin) {
        return res.status(400).json({ error: 'Origin required' });
    }

    try {
        const result = await redisClient.del(`blocked:origin:${origin}`);

        if (result === 1) {
            res.json({ 
                success: true, 
                message: `Origin ${origin} unblocked successfully`
            });
        } else {
            res.status(404).json({ error: 'Origin not found in blocked list' });
        }
    } catch (error) {
        console.error('Unblock origin error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Unblock a project
 */
const unblockProject = async (req, res) => {
    const { projectId, type = 'project' } = req.body;
    
    if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
    }

    try {
        const key = type === 'shared' ? `blocked:shared:${projectId}` : `blocked:${projectId}`;
        const result = await redisClient.del(key);

        if (result === 1) {
            res.json({ 
                success: true, 
                message: `Project ${projectId} unblocked successfully`,
                type
            });
        } else {
            res.status(404).json({ error: 'Project not found in blocked list' });
        }
    } catch (error) {
        console.error('Unblock project error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * List blocked projects
 */
const listBlockedProjects = async (req, res) => {
    try {
        const allKeys = await redisClient.keys('blocked:*');
        const blocked = [];

        for (const key of allKeys) {
            const data = await redisClient.get(key);
            if (data) {
                const blockData = JSON.parse(data);
                let id, type;
                
                if (key.includes('blocked:origin:')) {
                    id = key.replace('blocked:origin:', '');
                    type = 'origin';
                } else if (key.includes('blocked:shared:')) {
                    id = key.replace('blocked:shared:', '');
                    type = 'shared';
                } else {
                    id = key.replace('blocked:', '');
                    type = 'project';
                }
                
                blocked.push({
                    id,
                    type,
                    ...blockData
                });
            }
        }

        res.json({ blocked });
    } catch (error) {
        console.error('List blocked projects error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Check if project is blocked
 */
const checkProjectStatus = async (req, res) => {
    const { projectId, type = 'project' } = req.query;
    
    if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
    }

    try {
        const key = type === 'shared' ? `blocked:shared:${projectId}` : `blocked:${projectId}`;
        const blocked = await redisClient.get(key);

        if (blocked) {
            const blockData = JSON.parse(blocked);
            res.json({ 
                blocked: true, 
                ...blockData
            });
        } else {
            res.json({ blocked: false });
        }
    } catch (error) {
        console.error('Check project status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    blockProject,
    unblockProject,
    blockOrigin,
    unblockOrigin,
    listBlockedProjects,
    checkProjectStatus
};

const redis = require('redis');

// Redis client setup
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Redis connection established');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        process.exit(1);
    }
};

module.exports = { redisClient, connectRedis };

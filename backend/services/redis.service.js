import Redis from 'ioredis';


const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: () => null, // Don't retry on connection failure
    lazyConnect: true, // Don't connect immediately
    maxRetriesPerRequest: 0 // Don't retry failed commands
});


redisClient.on('connect', () => {
    console.log('Redis connected');
});

redisClient.on('error', (err) => {
    // Silently ignore Redis connection errors
    if (err.code !== 'ECONNREFUSED') {
        console.log('Redis error:', err.message);
    }
});

// Try to connect, but don't fail if it doesn't work
redisClient.connect().catch(() => {
    console.log('Redis not available - running without cache');
});

export default redisClient;
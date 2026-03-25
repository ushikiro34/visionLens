from redis.asyncio import Redis, ConnectionPool
from app.core.config import get_settings

settings = get_settings()

_pool: ConnectionPool | None = None


def get_redis_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True,
            max_connections=20,
        )
    return _pool


async def get_redis() -> Redis:
    return Redis(connection_pool=get_redis_pool())


async def close_redis():
    global _pool
    if _pool:
        await _pool.disconnect()
        _pool = None

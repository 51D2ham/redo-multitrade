const redisClient = require('../config/redisClient');

const STOCK_LOCK_TTL = 600; // 10 minutes

const lockVariantStock = async (sku, quantity) => {
  const key = `lock:variant:${sku}`;
  const result = await redisClient.set(key, quantity, {
    EX: STOCK_LOCK_TTL,
    NX: true,
  });

  if (result !== 'OK') {
    throw new Error(`Variant ${sku} is temporarily locked. Try again later.`);
  }
};

const releaseVariantLock = async (sku) => {
  const key = `lock:variant:${sku}`;
  await redisClient.del(key);
};

const releaseAllLocks = async (variantSkus) => {
  const keys = variantSkus.map(sku => `lock:variant:${sku}`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

module.exports = {
  lockVariantStock,
  releaseVariantLock,
  releaseAllLocks
};
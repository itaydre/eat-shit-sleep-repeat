// Best-effort in-memory rate limit. Scoped per serverless instance — on Vercel
// cold starts reset the counters, and traffic spread across instances means
// real-world max is max * instanceCount. Use Redis/KV for strict enforcement.
const buckets = new Map();

function rateLimit(key, opts) {
    opts = opts || {};
    const windowMs = opts.windowMs || 60000;
    const max = opts.max || 60;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
        buckets.set(key, { start: now, count: 1 });
        return { ok: true, remaining: max - 1 };
    }
    bucket.count++;
    if (bucket.count > max) {
        return { ok: false, retryAfterMs: windowMs - (now - bucket.start) };
    }
    return { ok: true, remaining: max - bucket.count };
}

// Periodically trim stale buckets so they don't grow unbounded.
setInterval(function () {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [k, v] of buckets) if (v.start < cutoff) buckets.delete(k);
}, 60 * 1000).unref?.();

function rateLimitRes(res, result) {
    if (result.ok) return false;
    const retryAfter = Math.ceil((result.retryAfterMs || 1000) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({ error: 'Too many requests', retryAfter });
    return true;
}

module.exports = { rateLimit, rateLimitRes };

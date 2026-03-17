const { getAuthUser } = require('../lib/auth');
const { updateLastFeedTime } = require('../lib/kv');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { endpoint, timestamp } = req.body;
    if (!endpoint || !timestamp) {
        return res.status(400).json({ error: 'Missing endpoint or timestamp' });
    }

    await updateLastFeedTime(endpoint, timestamp);
    res.status(200).json({ ok: true });
};

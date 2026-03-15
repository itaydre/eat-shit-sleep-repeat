const { saveSubscription } = require('../lib/kv');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { subscription, lastFeedTime } = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Missing subscription' });
    }

    const hash = await saveSubscription(subscription, lastFeedTime);
    res.status(200).json({ ok: true, hash });
};

const { hashEndpoint, markNotified } = require('../lib/kv');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { endpoint } = req.body;
    if (!endpoint) {
        return res.status(400).json({ error: 'Missing endpoint' });
    }

    const hash = hashEndpoint(endpoint);
    await markNotified(hash);
    res.status(200).json({ ok: true });
};

const webpush = require('web-push');
const { getAllSubscriptions, markNotified, removeSubscription } = require('../../lib/kv');

const FEED_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
);

module.exports = async function handler(req, res) {
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const subs = await getAllSubscriptions();
    const now = Date.now();
    let sent = 0;

    for (const sub of subs) {
        if (!sub.last_feed_time) continue;
        if (sub.notified) continue;
        if (now - sub.last_feed_time < FEED_INTERVAL) continue;

        const payload = JSON.stringify({
            title: 'Time to feed!',
            body: "It's been 2 hours since the last feeding.",
        });

        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload,
            );
            await markNotified(sub.hash);
            sent++;
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                await removeSubscription(sub.hash);
            }
        }
    }

    res.status(200).json({ checked: subs.length, sent });
};

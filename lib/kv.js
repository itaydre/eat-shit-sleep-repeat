const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

function hashEndpoint(endpoint) {
    return crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 16);
}

async function saveSubscription(subscription, lastFeedTime) {
    const hash = hashEndpoint(subscription.endpoint);
    await supabase.from('push_subscriptions').upsert({
        hash,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        last_feed_time: lastFeedTime || null,
        notified: false,
    }, { onConflict: 'hash' });
    return hash;
}

async function removeSubscription(hash) {
    await supabase.from('push_subscriptions').delete().eq('hash', hash);
}

async function updateLastFeedTime(endpoint, timestamp) {
    const hash = hashEndpoint(endpoint);
    await supabase.from('push_subscriptions').update({
        last_feed_time: timestamp,
        notified: false,
    }).eq('hash', hash);
}

async function getAllSubscriptions() {
    const { data } = await supabase.from('push_subscriptions').select('*');
    return data || [];
}

async function markNotified(hash) {
    await supabase.from('push_subscriptions').update({ notified: true }).eq('hash', hash);
}

module.exports = { hashEndpoint, saveSubscription, removeSubscription, updateLastFeedTime, getAllSubscriptions, markNotified };

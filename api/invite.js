const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { getAuthUser, getHouseholdId } = require('../lib/auth');
const { rateLimit, rateLimitRes } = require('../lib/rate-limit');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function newToken() {
    // URL-safe, ~22 chars, ~128 bits of entropy.
    return crypto.randomBytes(16).toString('base64url');
}

module.exports = async function handler(req, res) {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const rl = rateLimit('invite:' + user.id, { windowMs: 60_000, max: 20 });
    if (rateLimitRes(res, rl)) return;

    if (req.method === 'POST') {
        const householdId = await getHouseholdId(user.id);
        if (!householdId) return res.status(400).json({ error: 'No household' });

        const token = newToken();
        const expires_at = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
        const { error } = await supabase
            .from('household_invites')
            .insert({ token, household_id: householdId, created_by: user.id, expires_at });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ token, expires_at });
    }

    if (req.method === 'PUT') {
        const { token } = req.body || {};
        if (typeof token !== 'string' || token.length < 8 || token.length > 64) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        // Block rejoin: user who already has a household cannot join another.
        const existingHousehold = await getHouseholdId(user.id);
        if (existingHousehold) {
            return res.status(409).json({ error: 'Already in a household' });
        }

        const { data: invite, error: lookupErr } = await supabase
            .from('household_invites')
            .select('*')
            .eq('token', token)
            .maybeSingle();
        if (lookupErr) return res.status(500).json({ error: lookupErr.message });
        if (!invite) return res.status(404).json({ error: 'Invalid token' });
        if (invite.used_at) return res.status(410).json({ error: 'Token already used' });
        if (new Date(invite.expires_at).getTime() < Date.now()) {
            return res.status(410).json({ error: 'Token expired' });
        }

        // Atomically mark used + join household. We consume first to guard against
        // a race where two users submit the same token simultaneously; if consume
        // fails (already used), we bail before joining.
        const { data: consumed, error: consumeErr } = await supabase
            .from('household_invites')
            .update({ used_at: new Date().toISOString(), used_by: user.id })
            .eq('token', token)
            .is('used_at', null)
            .select()
            .single();
        if (consumeErr || !consumed) return res.status(410).json({ error: 'Token already used' });

        const { error: joinErr } = await supabase
            .from('profiles')
            .update({ household_id: invite.household_id })
            .eq('id', user.id);
        if (joinErr) return res.status(500).json({ error: joinErr.message });

        return res.status(200).json({ ok: true, household_id: invite.household_id });
    }

    res.status(405).end();
};

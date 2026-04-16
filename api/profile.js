const { createClient } = require('@supabase/supabase-js');
const { getAuthUser } = require('../lib/auth');
const { rateLimit, rateLimitRes } = require('../lib/rate-limit');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

module.exports = async function handler(req, res) {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const rl = rateLimit('profile:' + user.id, { windowMs: 60_000, max: 60 });
    if (rateLimitRes(res, rl)) return;

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
        const { baby_name, baby_birthdate, baby_birth_weight, baby_gender } = req.body || {};
        const updates = { baby_name, baby_birthdate, onboarding_done: true };
        if (baby_birth_weight !== undefined) updates.baby_birth_weight = baby_birth_weight;
        if (baby_gender !== undefined) updates.baby_gender = baby_gender;

        // NOTE: invite_code flow moved to PUT /api/invite (token-based). Profile
        // no longer accepts a household_id via this route; users who want to join
        // another household must redeem an invite token.

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    res.status(405).end();
};

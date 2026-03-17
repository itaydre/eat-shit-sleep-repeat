const { createClient } = require('@supabase/supabase-js');
const { getAuthUser } = require('../lib/auth');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

module.exports = async function handler(req, res) {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

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
        const { baby_name, baby_birthdate, invite_code } = req.body;
        const updates = { baby_name, baby_birthdate, onboarding_done: true };

        // If invite code provided, join that household
        if (invite_code) {
            const { data: existing } = await supabase
                .from('profiles')
                .select('household_id')
                .eq('household_id', invite_code)
                .limit(1)
                .single();
            if (existing) {
                updates.household_id = existing.household_id;
            }
        }

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

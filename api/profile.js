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
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Profile not found' });
            }
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
        const { baby_name, baby_birthdate, baby_birth_weight, baby_gender, invite_code } = req.body;
        const updates = { baby_name, baby_birthdate, onboarding_done: true };
        if (baby_birth_weight !== undefined) updates.baby_birth_weight = baby_birth_weight;
        if (baby_gender !== undefined) updates.baby_gender = baby_gender;

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

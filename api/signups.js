const { createClient } = require('@supabase/supabase-js');
const { getAuthUser } = require('../lib/auth');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

module.exports = async function handler(req, res) {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method !== 'GET') {
        return res.status(405).end();
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, baby_name, baby_gender, baby_birthdate, created_at')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
};

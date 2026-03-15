const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('baby_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(200);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { type, timestamp } = req.body;
        if (!type || !timestamp) {
            return res.status(400).json({ error: 'Missing type or timestamp' });
        }

        const { data, error } = await supabase
            .from('baby_logs')
            .insert({ type, timestamp })
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing id' });

        const { error } = await supabase
            .from('baby_logs')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ ok: true });
    }

    res.status(405).end();
};

module.exports = function handler(req, res) {
    res.status(200).json({
        supabaseUrl: (process.env.SUPABASE_URL || '').trim(),
        supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || '').trim(),
    });
};

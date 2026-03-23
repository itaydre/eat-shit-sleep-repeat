module.exports = function handler(req, res) {
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).json({
        supabaseUrl: (process.env.SUPABASE_URL || '').trim(),
        supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || '').trim(),
    });
};

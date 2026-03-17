const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

async function getAuthUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
}

async function getHouseholdId(userId) {
    const { data } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', userId)
        .single();
    return data ? data.household_id : null;
}

module.exports = { getAuthUser, getHouseholdId };

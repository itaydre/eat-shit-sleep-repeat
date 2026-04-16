const { createClient } = require('@supabase/supabase-js');
const { getAuthUser, getHouseholdId } = require('../lib/auth');
const { isValidActivityType } = require('../lib/baby-log');
const { rateLimit, rateLimitRes } = require('../lib/rate-limit');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

const MAX_DURATION_SECS = 6 * 60 * 60; // 6h ceiling — anything longer is a bug
const MAX_TIMESTAMP_SKEW_MS = 7 * 24 * 60 * 60 * 1000; // reject entries >7d in the future

module.exports = async function handler(req, res) {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Per-user rate limit (best-effort; see lib/rate-limit.js).
    const rl = rateLimit('logs:' + user.id, { windowMs: 60_000, max: 120 });
    if (rateLimitRes(res, rl)) return;

    const householdId = await getHouseholdId(user.id);
    if (!householdId) return res.status(400).json({ error: 'No household' });

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('baby_logs')
            .select('*')
            .eq('household_id', householdId)
            .order('timestamp', { ascending: false })
            .limit(500);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { type, timestamp, duration, client_id } = req.body || {};
        if (!isValidActivityType(type)) return res.status(400).json({ error: 'Invalid type' });
        if (typeof timestamp !== 'number' || !isFinite(timestamp)) {
            return res.status(400).json({ error: 'Invalid timestamp' });
        }
        if (timestamp > Date.now() + MAX_TIMESTAMP_SKEW_MS) {
            return res.status(400).json({ error: 'Timestamp too far in future' });
        }
        const row = { type, timestamp, user_id: user.id, household_id: householdId };
        if (duration !== undefined && duration !== null) {
            const n = Number(duration);
            if (!isFinite(n) || n < 0 || n > MAX_DURATION_SECS) {
                return res.status(400).json({ error: 'Invalid duration' });
            }
            row.duration = n;
        }
        if (typeof client_id === 'string' && client_id.length > 0 && client_id.length <= 64) {
            row.client_id = client_id;

            // Idempotency: if a row with the same client_id already exists for this
            // household, return it instead of creating a duplicate. Requires a UNIQUE
            // index on (household_id, client_id) — see supabase/migrations/*.sql.
            const { data: existing } = await supabase
                .from('baby_logs')
                .select('*')
                .eq('household_id', householdId)
                .eq('client_id', client_id)
                .limit(1)
                .maybeSingle();
            if (existing) return res.status(200).json(existing);
        }

        const { data, error } = await supabase
            .from('baby_logs')
            .insert(row)
            .select()
            .single();

        if (error) {
            // If the unique index caught a race, try to fetch the existing row.
            if (error.code === '23505' && row.client_id) {
                const { data: existing } = await supabase
                    .from('baby_logs')
                    .select('*')
                    .eq('household_id', householdId)
                    .eq('client_id', row.client_id)
                    .single();
                if (existing) return res.status(200).json(existing);
            }
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    }

    if (req.method === 'PATCH') {
        const { id, duration, type } = req.body || {};
        if (!id) return res.status(400).json({ error: 'Missing id' });

        const updates = {};
        if (duration !== undefined) {
            if (duration !== null) {
                const n = Number(duration);
                if (!isFinite(n) || n < 0 || n > MAX_DURATION_SECS) {
                    return res.status(400).json({ error: 'Invalid duration' });
                }
                updates.duration = n;
            } else {
                updates.duration = null;
            }
        }
        if (type !== undefined) {
            if (!isValidActivityType(type)) return res.status(400).json({ error: 'Invalid type' });
            updates.type = type;
        }
        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

        const { data, error } = await supabase
            .from('baby_logs')
            .update(updates)
            .eq('id', id)
            .eq('household_id', householdId)
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
        const { id } = req.body || {};
        if (!id) return res.status(400).json({ error: 'Missing id' });

        const { error } = await supabase
            .from('baby_logs')
            .delete()
            .eq('id', id)
            .eq('household_id', householdId);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ ok: true });
    }

    res.status(405).end();
};

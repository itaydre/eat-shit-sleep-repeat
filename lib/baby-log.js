(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.BabyLog = factory();
}(typeof self !== 'undefined' ? self : this, function () {

    const ACTIVITIES = {
        pee:           { emoji: '\u{1F4A6}', label: 'Pee' },
        poop:          { emoji: '\u{1F4A9}', label: 'Poop' },
        feed:          { emoji: '\u{1F931}', label: 'Feed' },
        feed_l:        { emoji: '\u{1F931}', label: 'Feed L', flip: true },
        feed_r:        { emoji: '\u{1F931}', label: 'Feed R' },
        pump:          { emoji: '\u{1F37C}', label: 'Pump' },
        pump_fridge:   { emoji: '\u{1F37C}', label: 'Pump', badge: '🧊' },
        pump_freezer:  { emoji: '\u{1F37C}', label: 'Pump', badge: '❄️' },
    };

    const ALLOWED_TYPES = Object.freeze(Object.keys(ACTIVITIES));

    function isValidActivityType(type) {
        return typeof type === 'string' && Object.prototype.hasOwnProperty.call(ACTIVITIES, type);
    }

    function emojiClass(type) {
        if (!type || typeof type !== 'string') return 'emoji-feed';
        if (type === 'pee') return 'emoji-pee';
        if (type === 'poop') return 'emoji-poop';
        if (type.startsWith('pump')) return 'emoji-pump';
        return 'emoji-feed';
    }

    function clampFeedInterval(hours) {
        const n = Number(hours);
        if (!isFinite(n)) return 2.5;
        if (n < 0.5) return 0.5;
        if (n > 6) return 6;
        return n;
    }

    function formatStopwatch(elapsedMs) {
        const secs = Math.max(0, Math.floor(elapsedMs / 1000));
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m + ':' + (s < 10 ? '0' + s : s);
    }

    // Returns { unit: 'days'|'weeks'|'months', value, fraction }
    function computeBabyAge(birthMs, nowMs) {
        const birth = new Date(birthMs);
        const now = new Date(nowMs);
        const totalHours = Math.max(0, (now.getTime() - birth.getTime()) / 3600000);
        const days = Math.floor(totalHours / 24);
        if (days < 7) {
            return { unit: 'days', value: days, fraction: Math.floor(totalHours % 24) };
        }
        if (days < 30) {
            return { unit: 'weeks', value: Math.floor(days / 7), fraction: days % 7 };
        }
        let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        if (now.getDate() < birth.getDate()) months--;
        const anniversary = new Date(birth);
        anniversary.setMonth(birth.getMonth() + months);
        const remainingDays = Math.max(0, Math.floor((now.getTime() - anniversary.getTime()) / 86400000));
        return { unit: 'months', value: months, fraction: remainingDays };
    }

    function formatBabyAge(age, gender) {
        const emoji = gender === 'boy' ? '👦 ' : gender === 'girl' ? '👧 ' : '';
        if (age.unit === 'days') return emoji + age.value + '.' + age.fraction + ' days old';
        if (age.unit === 'weeks') return emoji + age.value + '.' + age.fraction + (age.value === 1 ? ' week' : ' weeks') + ' old';
        return emoji + age.value + '.' + age.fraction + (age.value === 1 ? ' month' : ' months') + ' old';
    }

    function formatDayLabel(ts, nowMs) {
        const d = new Date(ts);
        const now = new Date(nowMs != null ? nowMs : Date.now());
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === now.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    }

    // Newest-first, stable, rejects malformed rows.
    function normalizeEntries(raw) {
        if (!Array.isArray(raw)) return [];
        return raw
            .filter(function (e) { return e && typeof e.timestamp === 'number' && isValidActivityType(e.type); })
            .slice()
            .sort(function (a, b) { return b.timestamp - a.timestamp; });
    }

    // Merge fresh server entries with local ones, preserving in-flight optimistic
    // items (no id) and the pending flag on items the server round-tripped back.
    function mergeEntries(local, fresh) {
        const freshList = Array.isArray(fresh) ? fresh : [];
        const localList = Array.isArray(local) ? local : [];
        const byId = new Map();
        for (const e of freshList) {
            if (e && e.id != null) byId.set(String(e.id), e);
        }
        // Optimistic local entries are ones still in-flight (no id assigned).
        const unsavedLocal = localList.filter(function (e) { return e && e.id == null; });
        // Preserve pending flag from local onto fresh
        const pendingStarts = new Set(
            localList.filter(function (e) { return e && e.pending; }).map(function (e) { return e.timestamp + ':' + e.type; })
        );
        for (const e of freshList) {
            const key = e.timestamp + ':' + e.type;
            if (pendingStarts.has(key)) e.pending = true;
        }
        return normalizeEntries(freshList.concat(unsavedLocal));
    }

    // Should we resume a feed/pump timer for this entry?
    // Only if the entry is explicitly pending (no end time recorded), fresh,
    // and wasn't explicitly stopped via localStorage "lastStopped*" marker.
    function shouldResumeSession(entry, nowMs, opts) {
        opts = opts || {};
        const maxAge = opts.maxAgeMs != null ? opts.maxAgeMs : 2 * 60 * 60 * 1000;
        const lastStoppedTs = opts.lastStoppedTs;
        if (!entry || typeof entry.timestamp !== 'number') return false;
        // Only treat as in-progress if the server did NOT return a duration.
        // A duration of 0 from a manually-added entry is a completed zero-length event.
        const hasDuration = entry.duration != null && !Number.isNaN(entry.duration);
        if (hasDuration) return false;
        if (!entry.pending) return false;
        if ((nowMs - entry.timestamp) > maxAge) return false;
        if (lastStoppedTs != null && String(entry.timestamp) === String(lastStoppedTs)) return false;
        return true;
    }

    // Walk back through adjacent feed entries to find the start of the current session.
    function findSessionStart(entries, nowMs, opts) {
        opts = opts || {};
        const gap = opts.sessionGapMs != null ? opts.sessionGapMs : 30 * 60 * 1000;
        const isFeed = opts.isFeed || function (e) { return e.type === 'feed' || e.type === 'feed_l' || e.type === 'feed_r'; };
        const feeds = (entries || []).filter(function (e) { return e && typeof e.timestamp === 'number' && isFeed(e); });
        feeds.sort(function (a, b) { return b.timestamp - a.timestamp; });
        if (feeds.length === 0) return null;
        let start = feeds[0].timestamp;
        for (let i = 1; i < feeds.length; i++) {
            if (start - feeds[i].timestamp <= gap) start = feeds[i].timestamp;
            else break;
        }
        return start;
    }

    // Group entries by day label with per-activity counts. Pure — takes now for tests.
    function summarizeByDay(entries, nowMs) {
        const out = new Map();
        for (const e of entries || []) {
            if (!e || typeof e.timestamp !== 'number' || !isValidActivityType(e.type)) continue;
            const label = formatDayLabel(e.timestamp, nowMs);
            if (!out.has(label)) out.set(label, { pee: 0, poop: 0, feed_l: 0, feed_r: 0, pump: 0, pumpDurationSecs: 0 });
            const s = out.get(label);
            if (e.type === 'pee') s.pee++;
            else if (e.type === 'poop') s.poop++;
            else if (e.type === 'feed_l') s.feed_l++;
            else if (e.type === 'feed_r') s.feed_r++;
            else if (e.type.startsWith('pump')) {
                s.pump++;
                if (typeof e.duration === 'number') s.pumpDurationSecs += e.duration;
            }
        }
        return out;
    }

    // Hostname check that's narrow enough to avoid `foo-dev.attacker.com` false positives.
    function isDevHost(hostname) {
        if (!hostname) return false;
        if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
        // Accept a hostname of the form  <anything>-dev.<rest>  where -dev is a full label.
        const m = hostname.match(/^([a-z0-9-]+)-dev\.([a-z0-9.-]+)$/i);
        if (!m) return false;
        const suffix = m[2].toLowerCase();
        return suffix.endsWith('vercel.app') || suffix === 'local' || suffix.endsWith('.local');
    }

    function randomClientId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        // RFC4122-ish fallback
        return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    return {
        ACTIVITIES: ACTIVITIES,
        ALLOWED_TYPES: ALLOWED_TYPES,
        isValidActivityType: isValidActivityType,
        emojiClass: emojiClass,
        clampFeedInterval: clampFeedInterval,
        formatStopwatch: formatStopwatch,
        computeBabyAge: computeBabyAge,
        formatBabyAge: formatBabyAge,
        formatDayLabel: formatDayLabel,
        normalizeEntries: normalizeEntries,
        mergeEntries: mergeEntries,
        shouldResumeSession: shouldResumeSession,
        findSessionStart: findSessionStart,
        summarizeByDay: summarizeByDay,
        isDevHost: isDevHost,
        randomClientId: randomClientId,
    };
}));

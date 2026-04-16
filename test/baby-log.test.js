const { test } = require('node:test');
const assert = require('node:assert/strict');
const BL = require('../lib/baby-log');

test('isValidActivityType rejects unknown + non-string', () => {
    assert.equal(BL.isValidActivityType('pee'), true);
    assert.equal(BL.isValidActivityType('feed_l'), true);
    assert.equal(BL.isValidActivityType('pump_fridge'), true);
    assert.equal(BL.isValidActivityType('pump_something_else'), false);
    assert.equal(BL.isValidActivityType(''), false);
    assert.equal(BL.isValidActivityType(null), false);
    assert.equal(BL.isValidActivityType(undefined), false);
    assert.equal(BL.isValidActivityType('__proto__'), false);
    assert.equal(BL.isValidActivityType('constructor'), false);
});

test('emojiClass never throws on bad input', () => {
    assert.equal(BL.emojiClass('pee'), 'emoji-pee');
    assert.equal(BL.emojiClass('poop'), 'emoji-poop');
    assert.equal(BL.emojiClass('pump'), 'emoji-pump');
    assert.equal(BL.emojiClass('pump_fridge'), 'emoji-pump');
    assert.equal(BL.emojiClass('feed_l'), 'emoji-feed');
    assert.equal(BL.emojiClass(undefined), 'emoji-feed');
    assert.equal(BL.emojiClass(null), 'emoji-feed');
});

test('clampFeedInterval constrains to [0.5, 6]', () => {
    assert.equal(BL.clampFeedInterval(0), 0.5);
    assert.equal(BL.clampFeedInterval(0.4), 0.5);
    assert.equal(BL.clampFeedInterval(0.5), 0.5);
    assert.equal(BL.clampFeedInterval(2.5), 2.5);
    assert.equal(BL.clampFeedInterval(6), 6);
    assert.equal(BL.clampFeedInterval(7), 6);
    assert.equal(BL.clampFeedInterval(-5), 0.5);
    assert.equal(BL.clampFeedInterval(NaN), 2.5);
    assert.equal(BL.clampFeedInterval('bad'), 2.5);
});

test('formatStopwatch renders m:ss', () => {
    assert.equal(BL.formatStopwatch(0), '0:00');
    assert.equal(BL.formatStopwatch(500), '0:00');
    assert.equal(BL.formatStopwatch(1000), '0:01');
    assert.equal(BL.formatStopwatch(59000), '0:59');
    assert.equal(BL.formatStopwatch(60000), '1:00');
    assert.equal(BL.formatStopwatch(61000), '1:01');
    assert.equal(BL.formatStopwatch(12 * 60 * 1000 + 7 * 1000), '12:07');
    assert.equal(BL.formatStopwatch(-1000), '0:00'); // never negative
});

test('computeBabyAge handles days / weeks / months', () => {
    const birth = new Date('2026-01-01T00:00:00Z').getTime();
    // 3 days + 5 hours
    const t3d = new Date('2026-01-04T05:00:00Z').getTime();
    let a = BL.computeBabyAge(birth, t3d);
    assert.equal(a.unit, 'days');
    assert.equal(a.value, 3);
    assert.equal(a.fraction, 5);

    // 2 weeks + 3 days
    const t2w = new Date('2026-01-18T00:00:00Z').getTime();
    a = BL.computeBabyAge(birth, t2w);
    assert.equal(a.unit, 'weeks');
    assert.equal(a.value, 2);
    assert.equal(a.fraction, 3);

    // 2 months + ~15 days — this previously drifted because of /30 math
    const t2mo = new Date('2026-03-16T00:00:00Z').getTime();
    a = BL.computeBabyAge(birth, t2mo);
    assert.equal(a.unit, 'months');
    assert.equal(a.value, 2);
    // 2026-03-01 → 2026-03-16 = 15 days
    assert.equal(a.fraction, 15);
});

test('computeBabyAge month math is not /30-based', () => {
    // Feb 28 birth → Apr 1: /30 math says 1 month + 2 days; real month math says 1 month + 4 days.
    const birth = new Date('2026-02-28T00:00:00').getTime();
    const now = new Date('2026-04-01T00:00:00').getTime();
    const a = BL.computeBabyAge(birth, now);
    assert.equal(a.unit, 'months');
    assert.equal(a.value, 1);
    assert.equal(a.fraction, 4); // would be 2 under /30 math
});

test('formatBabyAge includes gender emoji and singular/plural', () => {
    assert.match(BL.formatBabyAge({ unit: 'days', value: 3, fraction: 4 }, 'girl'), /^👧 3\.4 days old$/);
    assert.match(BL.formatBabyAge({ unit: 'weeks', value: 1, fraction: 0 }, 'boy'), /^👦 1\.0 week old$/);
    assert.match(BL.formatBabyAge({ unit: 'weeks', value: 2, fraction: 0 }, null), /^2\.0 weeks old$/);
    assert.match(BL.formatBabyAge({ unit: 'months', value: 1, fraction: 5 }, undefined), /^1\.5 month old$/);
    assert.match(BL.formatBabyAge({ unit: 'months', value: 3, fraction: 0 }, 'boy'), /^👦 3\.0 months old$/);
});

test('formatDayLabel returns Today/Yesterday with injected now', () => {
    const now = new Date('2026-04-17T10:00:00').getTime();
    assert.equal(BL.formatDayLabel(new Date('2026-04-17T02:00:00').getTime(), now), 'Today');
    assert.equal(BL.formatDayLabel(new Date('2026-04-16T23:00:00').getTime(), now), 'Yesterday');
    const older = BL.formatDayLabel(new Date('2026-04-10T12:00:00').getTime(), now);
    assert.ok(older !== 'Today' && older !== 'Yesterday');
});

test('normalizeEntries filters bad rows and sorts newest-first', () => {
    const now = Date.now();
    const input = [
        { timestamp: now - 1000, type: 'pee' },
        { timestamp: now,        type: 'feed_l' },
        { timestamp: 'bad',      type: 'pee' },
        { timestamp: now - 2000, type: 'nonsense' },
        null,
        undefined,
        { timestamp: now - 500,  type: 'poop' },
    ];
    const out = BL.normalizeEntries(input);
    assert.equal(out.length, 3);
    assert.equal(out[0].type, 'feed_l');
    assert.equal(out[1].type, 'poop');
    assert.equal(out[2].type, 'pee');
});

test('mergeEntries preserves in-flight optimistic rows', () => {
    const now = Date.now();
    const local = [
        { id: 1, timestamp: now - 1000, type: 'pee' },
        { timestamp: now - 500, type: 'poop' }, // in flight, no id
    ];
    const fresh = [
        { id: 1, timestamp: now - 1000, type: 'pee' },
        { id: 2, timestamp: now - 3000, type: 'feed_l' },
    ];
    const merged = BL.mergeEntries(local, fresh);
    // Unsaved local should be present
    assert.equal(merged.some(e => e.id == null && e.type === 'poop'), true);
    assert.equal(merged.length, 3);
});

test('mergeEntries propagates pending flag from local to fresh', () => {
    const now = Date.now();
    const local = [
        { timestamp: now, type: 'feed_l', pending: true },
    ];
    const fresh = [
        { id: 99, timestamp: now, type: 'feed_l' },
    ];
    const merged = BL.mergeEntries(local, fresh);
    const row = merged.find(e => e.id === 99);
    assert.equal(row.pending, true);
});

test('shouldResumeSession requires pending + no duration + recency', () => {
    const now = Date.now();
    // Entry that is legitimately in-progress
    assert.equal(BL.shouldResumeSession({ timestamp: now - 5 * 60 * 1000, type: 'feed_l', pending: true, duration: null }, now), true);
    // Entry with explicit duration 0 (manual retro entry) must NOT resume
    assert.equal(BL.shouldResumeSession({ timestamp: now - 5 * 60 * 1000, type: 'feed_l', pending: true, duration: 0 }, now), false);
    // Entry without pending flag (server-only row) must NOT resume
    assert.equal(BL.shouldResumeSession({ timestamp: now - 5 * 60 * 1000, type: 'feed_l', duration: null }, now), false);
    // Old entry (>2h) must NOT resume
    assert.equal(BL.shouldResumeSession({ timestamp: now - 3 * 60 * 60 * 1000, type: 'feed_l', pending: true, duration: null }, now), false);
    // Explicitly stopped entry must NOT resume
    const ts = now - 60 * 1000;
    assert.equal(BL.shouldResumeSession({ timestamp: ts, type: 'feed_l', pending: true, duration: null }, now, { lastStoppedTs: String(ts) }), false);
});

test('findSessionStart walks back through adjacent feeds', () => {
    const now = Date.now();
    const MIN = 60 * 1000;
    // Three feeds within 30min of each other, then a gap.
    const entries = [
        { timestamp: now,             type: 'feed_l' },
        { timestamp: now - 10 * MIN,  type: 'feed_r' },
        { timestamp: now - 25 * MIN,  type: 'feed_l' },
        { timestamp: now - 90 * MIN,  type: 'feed_r' }, // beyond gap
        { timestamp: now - 120 * MIN, type: 'pee' },    // ignored
    ];
    const start = BL.findSessionStart(entries, now);
    assert.equal(start, now - 25 * MIN);
});

test('findSessionStart returns null when no feeds', () => {
    const entries = [{ timestamp: Date.now(), type: 'pee' }];
    assert.equal(BL.findSessionStart(entries, Date.now()), null);
});

test('summarizeByDay counts per activity', () => {
    const now = new Date('2026-04-17T12:00:00').getTime();
    const entries = [
        { timestamp: now - 1000, type: 'pee' },
        { timestamp: now - 2000, type: 'pee' },
        { timestamp: now - 3000, type: 'feed_l' },
        { timestamp: now - 4000, type: 'pump_fridge', duration: 900 },
        { timestamp: now - 4000, type: 'pump', duration: 600 },
    ];
    const out = BL.summarizeByDay(entries, now);
    const today = out.get('Today');
    assert.equal(today.pee, 2);
    assert.equal(today.feed_l, 1);
    assert.equal(today.pump, 2);
    assert.equal(today.pumpDurationSecs, 1500);
});

test('isDevHost accepts localhost and label-bounded -dev', () => {
    assert.equal(BL.isDevHost('localhost'), true);
    assert.equal(BL.isDevHost('127.0.0.1'), true);
    assert.equal(BL.isDevHost('my-app-dev.vercel.app'), true);
    assert.equal(BL.isDevHost('app-dev.local'), true);
    // These were false positives with naive includes('-dev.')
    assert.equal(BL.isDevHost('foo-dev.attacker.com'), false);
    assert.equal(BL.isDevHost('evil.com'), false);
    assert.equal(BL.isDevHost('eat-shit-sleep.com'), false);
    assert.equal(BL.isDevHost(''), false);
    assert.equal(BL.isDevHost(null), false);
});

test('randomClientId returns a stable-ish non-empty string', () => {
    const a = BL.randomClientId();
    const b = BL.randomClientId();
    assert.notEqual(a, b);
    assert.ok(a.length > 0);
    assert.ok(b.length > 0);
});

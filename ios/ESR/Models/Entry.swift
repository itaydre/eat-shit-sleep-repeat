import Foundation

/// One logged event — 1:1 with a row in `public.baby_logs`.
/// Uses the same JSON shape the Vercel API serves so the web + native clients
/// can share the same Supabase schema without translation.
struct Entry: Identifiable, Codable, Hashable {
    let id: Int64?
    let type: Activity
    /// Milliseconds since 1970 UTC — matches the `bigint` timestamp on the server.
    let timestamp: Int64
    let duration: Int?
    let client_id: String?
    let household_id: String?
    let user_id: String?

    /// Client-only marker for in-progress feed / pump sessions awaiting a stop.
    var pending: Bool = false

    var date: Date { Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000) }
    var durationSeconds: TimeInterval? { duration.map(TimeInterval.init) }

    enum CodingKeys: String, CodingKey {
        case id, type, timestamp, duration, client_id, household_id, user_id
    }

    init(id: Int64? = nil,
         type: Activity,
         timestamp: Int64,
         duration: Int? = nil,
         client_id: String? = nil,
         household_id: String? = nil,
         user_id: String? = nil,
         pending: Bool = false) {
        self.id = id
        self.type = type
        self.timestamp = timestamp
        self.duration = duration
        self.client_id = client_id
        self.household_id = household_id
        self.user_id = user_id
        self.pending = pending
    }
}

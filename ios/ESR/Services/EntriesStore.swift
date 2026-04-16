import Foundation
import Observation
import Supabase

/// In-memory mirror of `baby_logs` for the current household.
/// Writes are optimistic — UI updates first, then the server call reconciles.
@Observable
@MainActor
final class EntriesStore {
    var entries: [Entry] = []
    var isLoading: Bool = false
    var lastError: String?

    func refresh(householdId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let fresh = try await SupabaseService.shared.fetchLogs(householdId: householdId)
            merge(fresh)
        } catch {
            lastError = error.localizedDescription
        }
    }

    /// Log a new entry (non-session actions like pee/poop, or the initial
    /// in-progress row for feed/pump).
    @discardableResult
    func log(activity: Activity,
             timestamp: Date = .now,
             duration: Int? = nil,
             householdId: String,
             userId: String,
             pending: Bool = false) async -> Entry {
        let clientId = UUID().uuidString
        let optimistic = Entry(
            id: nil,
            type: activity,
            timestamp: Int64(timestamp.timeIntervalSince1970 * 1000),
            duration: duration,
            client_id: clientId,
            household_id: householdId,
            user_id: userId,
            pending: pending
        )
        entries.insert(optimistic, at: 0)

        do {
            let saved = try await SupabaseService.shared.insertLog(entry: optimistic)
            if let idx = entries.firstIndex(where: { $0.client_id == clientId }) {
                var merged = saved
                merged.pending = pending
                entries[idx] = merged
            }
            return saved
        } catch {
            lastError = error.localizedDescription
            return optimistic
        }
    }

    /// Mark a session as finished — patches the row with its final duration.
    func finishSession(entryId: Int64, duration: Int, householdId: String) async {
        do {
            let updated = try await SupabaseService.shared.patchLog(
                id: entryId,
                fields: ["duration": .integer(duration)],
                householdId: householdId
            )
            if let idx = entries.firstIndex(where: { $0.id == entryId }) {
                var merged = updated
                merged.pending = false
                entries[idx] = merged
            }
        } catch {
            lastError = error.localizedDescription
        }
    }

    func delete(entryId: Int64, householdId: String) async {
        entries.removeAll { $0.id == entryId }
        do {
            try await SupabaseService.shared.deleteLog(id: entryId, householdId: householdId)
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Derived

    /// Entries whose local-day matches the given date.
    func entries(on date: Date, calendar: Calendar = .current) -> [Entry] {
        entries.filter { calendar.isDate($0.date, inSameDayAs: date) }
    }

    /// Counts per Activity for the given date.
    func counts(on date: Date, calendar: Calendar = .current) -> [Activity: Int] {
        var out: [Activity: Int] = [:]
        for entry in entries(on: date, calendar: calendar) {
            let key: Activity = entry.type.isPump ? .pump : entry.type
            out[key, default: 0] += 1
        }
        return out
    }

    /// The most recent entry of a given activity (pump variants collapsed).
    func lastEntry(of activity: Activity) -> Entry? {
        entries.first { entry in
            activity.isPump ? entry.type.isPump : entry.type == activity
        }
    }

    /// Currently-running session (no duration, recent, explicitly pending).
    func pendingSession(of activity: Activity) -> Entry? {
        entries.first { entry in
            entry.pending &&
            entry.duration == nil &&
            Date().timeIntervalSince(entry.date) < 2 * 3600 &&
            (activity.isPump ? entry.type.isPump : entry.type == activity)
        }
    }

    // MARK: - Merge helper

    private func merge(_ fresh: [Entry]) {
        // Preserve optimistic in-flight rows (no id yet) and pending flags.
        let unsaved = entries.filter { $0.id == nil }
        let pendingIDs = Set(entries.filter(\.pending).compactMap(\.id))
        var merged = fresh.map { e -> Entry in
            var copy = e
            if let id = e.id, pendingIDs.contains(id) { copy.pending = true }
            return copy
        }
        merged.append(contentsOf: unsaved)
        merged.sort { $0.timestamp > $1.timestamp }
        entries = merged
    }
}

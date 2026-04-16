import Foundation
import Observation

/// Owns the active feed / pump stopwatch that paints on the tile itself.
/// Only one session can be active at a time (starting a feed stops a pump
/// and vice versa, matching the web behavior).
@Observable
@MainActor
final class SessionStore {
    struct ActiveSession {
        let activity: Activity
        let startedAt: Date
        let entryId: Int64?
    }

    var active: ActiveSession?
    var elapsed: TimeInterval = 0
    /// Set when the session hits the long-running threshold so the view can
    /// present a "Still going?" confirmation.
    var longSessionPending: Bool = false

    private var tickTask: Task<Void, Never>?

    func start(_ activity: Activity, entryId: Int64?) {
        active = ActiveSession(activity: activity, startedAt: .now, entryId: entryId)
        elapsed = 0
        longSessionPending = false
        tickTask?.cancel()
        tickTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                await MainActor.run {
                    guard let self, let active = self.active else { return }
                    self.elapsed = Date().timeIntervalSince(active.startedAt)
                    if !self.longSessionPending && self.elapsed >= AppConfig.longSessionThreshold {
                        self.longSessionPending = true
                    }
                }
            }
        }
    }

    func stop() -> ActiveSession? {
        tickTask?.cancel()
        tickTask = nil
        let ended = active
        active = nil
        elapsed = 0
        longSessionPending = false
        return ended
    }

    var isActive: Bool { active != nil }

    func isActive(_ activity: Activity) -> Bool {
        guard let a = active else { return false }
        if activity.isPump { return a.activity.isPump }
        return a.activity == activity
    }

    var formattedElapsed: String {
        let total = Int(elapsed)
        let m = total / 60, s = total % 60
        return String(format: "%d:%02d", m, s)
    }
}

import SwiftUI

/// Mirrors the web's "next feeding" pill at the bottom. Computes expected
/// next feed from the most-recent feed entry + user-set interval (default 2.5h).
struct NextFeedingBar: View {
    @Environment(EntriesStore.self) private var entries

    @AppStorage("feedIntervalHours") private var feedIntervalHours: Double = 2.5

    private var lastFeed: Date? {
        entries.entries
            .first { $0.type.isFeed && $0.duration != nil }?
            .date
    }

    private var nextFeed: Date? {
        lastFeed.map { $0.addingTimeInterval(feedIntervalHours * 3600) }
    }

    var body: some View {
        if let nextFeed, let label = labelFor(nextFeed: nextFeed) {
            HStack(spacing: 12) {
                Text("🍼").font(.system(size: 24))
                VStack(alignment: .leading, spacing: 1) {
                    Text(label.title)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                    Text(label.countdown)
                        .font(.title3.weight(.bold))
                        .monospacedDigit()
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                label.overdue
                ? Color.pink.opacity(0.18)
                : Color.orange.opacity(0.18),
                in: RoundedRectangle(cornerRadius: 14)
            )
        }
    }

    private struct LabelParts { let title: String; let countdown: String; let overdue: Bool }

    private func labelFor(nextFeed: Date) -> LabelParts? {
        let diff = nextFeed.timeIntervalSinceNow
        let timeStr = Self.timeFormatter.string(from: nextFeed)
        if diff <= 0 {
            let overdue = Int(abs(diff))
            let h = overdue / 3600, m = (overdue % 3600) / 60
            return LabelParts(
                title: "Feeding overdue (was \(timeStr))",
                countdown: String(format: "%dh %02dm", h, m),
                overdue: true
            )
        }
        let mins = Int(diff) / 60
        return LabelParts(
            title: "Next feeding at \(timeStr)",
            countdown: String(format: "%dh %02dm", mins / 60, mins % 60),
            overdue: false
        )
    }

    private static let timeFormatter: DateFormatter = {
        let df = DateFormatter()
        df.timeStyle = .short
        return df
    }()
}

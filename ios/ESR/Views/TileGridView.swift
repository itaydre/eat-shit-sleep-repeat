import SwiftUI

struct TileGridView: View {
    let selectedDate: Date
    let onLog: (Activity, Date) async -> Void

    @Environment(EntriesStore.self) private var entries
    @Environment(SessionStore.self) private var session

    private var counts: [Activity: Int] {
        entries.counts(on: selectedDate)
    }

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
            ForEach(Activity.homeTiles) { activity in
                ActionTile(
                    activity: activity,
                    count: counts[activity] ?? 0,
                    lastEntry: entries.lastEntry(of: activity),
                    isActive: session.isActive(activity),
                    elapsedLabel: session.isActive(activity) ? session.formattedElapsed : nil
                ) {
                    Task { await onLog(activity, .now) }
                } onStop: {
                    Task { await onLog(activity, .now) } // toggle stop via same path
                }
            }
            CustomTile {
                // Hoist the sheet into HomeView; here we only bubble the intent up
                // via a notification name so HomeView's state flips.
                NotificationCenter.default.post(name: .showAddEntry, object: nil)
            }
        }
    }
}

extension Notification.Name {
    static let showAddEntry = Notification.Name("ESR.showAddEntry")
}

// MARK: - Tile

struct ActionTile: View {
    let activity: Activity
    let count: Int
    let lastEntry: Entry?
    let isActive: Bool
    let elapsedLabel: String?
    let onTap: () -> Void
    let onStop: () -> Void

    var body: some View {
        Button(action: onTap) {
            tileBody
        }
        .buttonStyle(.plain)
        .overlay(alignment: .topTrailing) {
            if isActive {
                Button(action: onStop) {
                    Image(systemName: "stop.fill")
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(.red, in: RoundedRectangle(cornerRadius: 12))
                        .shadow(color: .red.opacity(0.35), radius: 6, y: 2)
                }
                .padding(10)
            }
        }
    }

    private var tileBody: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 20)
                .fill(activity.tileBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .strokeBorder(activity.tint.opacity(isActive ? 0.6 : 0), lineWidth: 2.5)
                )

            VStack(alignment: .leading) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(activity.label)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(activity.tint)
                    if let lastEntry {
                        Text("last " + Self.timeFormatter.string(from: lastEntry.date))
                            .font(.caption2)
                            .foregroundStyle(activity.tint.opacity(0.55))
                    }
                }

                Spacer()

                if isActive, let label = elapsedLabel {
                    Text(label)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(activity.tint)
                        .monospacedDigit()
                } else {
                    Text("\(count)")
                        .font(.system(size: 44, weight: .regular, design: .rounded))
                        .foregroundStyle(activity.tint.opacity(0.75))
                        .monospacedDigit()
                }

                HStack {
                    Spacer()
                    Text(activity.emoji)
                        .font(.system(size: 34))
                        .scaleEffect(x: activity.flipEmojiHorizontally ? -1 : 1, y: 1, anchor: .center)
                }
            }
            .padding(16)
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(1, contentMode: .fit)
        .contentShape(Rectangle())
    }

    private static let timeFormatter: DateFormatter = {
        let df = DateFormatter()
        df.timeStyle = .short
        return df
    }()
}

// MARK: - Custom tile

struct CustomTile: View {
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Text("＋")
                    .font(.system(size: 52, weight: .regular))
                    .foregroundStyle(.secondary.opacity(0.6))
                Text("Add entry")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(1, contentMode: .fit)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [5]))
                    .foregroundStyle(.secondary.opacity(0.5))
            )
        }
        .buttonStyle(.plain)
    }
}

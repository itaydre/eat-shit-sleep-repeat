import SwiftUI
import Charts

struct StatsView: View {
    @Environment(EntriesStore.self) private var entries

    private var last7Days: [(Date, [Activity: Int])] {
        let cal = Calendar.current
        let days: [Date] = (0..<7).reversed().compactMap {
            cal.date(byAdding: .day, value: -$0, to: cal.startOfDay(for: .now))
        }
        return days.map { ($0, entries.counts(on: $0)) }
    }

    var body: some View {
        List {
            ForEach(Array(last7Days.enumerated()), id: \.offset) { _, day in
                Section(Self.df.string(from: day.0)) {
                    ForEach(Activity.homeTiles) { activity in
                        HStack {
                            Text(activity.emoji).font(.title3)
                            Text(activity.label)
                            Spacer()
                            Text("\(day.1[activity] ?? 0)")
                                .font(.headline.monospacedDigit())
                        }
                    }
                }
            }
        }
        .navigationTitle("Stats")
        .navigationBarTitleDisplayMode(.inline)
    }

    private static let df: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "EEEE, MMM d"
        return df
    }()
}

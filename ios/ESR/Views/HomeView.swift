import SwiftUI

struct HomeView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(EntriesStore.self) private var entries
    @Environment(SessionStore.self) private var session

    @State private var selectedDayOffset: Int = 0
    @State private var showSettings: Bool = false
    @State private var showAddEntry: Bool = false
    @State private var showLongSessionAlert: Bool = false

    private var selectedDate: Date {
        Calendar.current.date(byAdding: .day, value: selectedDayOffset, to: .now) ?? .now
    }

    private var householdId: String? { auth.profile?.household_id }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(spacing: 16) {
                        DayHeader(offset: $selectedDayOffset, date: selectedDate)
                        TileGridView(
                            selectedDate: selectedDate,
                            onLog: logAction
                        )
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 180) // leave room for bottom strip + bar
                }
                .refreshable {
                    if let h = householdId { await entries.refresh(householdId: h) }
                }

                VStack(spacing: 10) {
                    NextFeedingBar()
                    DayStripView(selectedOffset: $selectedDayOffset)
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
            .navigationTitle(auth.profile?.baby_name.map { "\($0)'s log" } ?? "Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    NavigationLink { StatsView() } label: {
                        Image(systemName: "chart.bar")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showAddEntry) {
                AddEntrySheet { activity, date in
                    Task { await logAction(activity, at: date) }
                }
            }
            .task {
                if let h = householdId { await entries.refresh(householdId: h) }
            }
            .onChange(of: session.longSessionPending) { _, pending in
                if pending { showLongSessionAlert = true }
            }
            .alert("Still \(session.active?.activity.label.lowercased() ?? "going")?",
                   isPresented: $showLongSessionAlert) {
                Button("Keep going", role: .cancel) { session.longSessionPending = false }
                Button("Stop timer", role: .destructive) {
                    Task { await stopActiveSession() }
                    session.longSessionPending = false
                }
            } message: {
                Text("This has been running for 20 minutes.")
            }
        }
    }

    private func logAction(_ activity: Activity, at timestamp: Date = .now) async {
        guard let householdId,
              let userId = auth.profile?.id else { return }

        // Session-based: toggle start / stop on the tile itself.
        if activity.isSessionBased {
            if session.isActive(activity) {
                await stopActiveSession()
                return
            }
            // Stop any other running session first (mirrors the web behavior).
            if session.isActive { await stopActiveSession() }

            let started = await entries.log(
                activity: activity,
                timestamp: timestamp,
                duration: nil,
                householdId: householdId,
                userId: userId,
                pending: true
            )
            session.start(activity, entryId: started.id)
            return
        }

        // Instant tap: pee / poop.
        await entries.log(
            activity: activity,
            timestamp: timestamp,
            duration: nil,
            householdId: householdId,
            userId: userId
        )
    }

    private func stopActiveSession() async {
        guard let ended = session.stop(),
              let householdId,
              let entryId = ended.entryId else { return }
        let duration = Int(Date().timeIntervalSince(ended.startedAt))
        await entries.finishSession(entryId: entryId, duration: duration, householdId: householdId)
    }
}

// MARK: - Day header

private struct DayHeader: View {
    @Binding var offset: Int
    let date: Date

    var body: some View {
        HStack {
            Button {
                withAnimation(.snappy) { offset -= 1 }
            } label: {
                Image(systemName: "chevron.left").font(.title3).padding(6)
            }

            Spacer()
            VStack(spacing: 2) {
                Text(offset == 0 ? "Today" : Self.dateFormatter.string(from: date))
                    .font(.headline)
                Text(offset == 0 ? "" : (offset == -1 ? "Yesterday" : ""))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()

            Button {
                withAnimation(.snappy) { if offset < 0 { offset += 1 } }
            } label: {
                Image(systemName: "chevron.right").font(.title3).padding(6)
            }
            .opacity(offset == 0 ? 0.3 : 1)
            .disabled(offset == 0)
        }
        .foregroundStyle(.primary)
    }

    private static let dateFormatter: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "EEEE, MMM d"
        return df
    }()
}

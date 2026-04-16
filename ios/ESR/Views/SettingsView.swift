import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthStore.self) private var auth
    @AppStorage("feedIntervalHours") private var feedIntervalHours: Double = 2.5
    @State private var inviteToken: String?
    @State private var isGeneratingInvite = false

    var body: some View {
        NavigationStack {
            Form {
                if let profile = auth.profile {
                    Section("Baby") {
                        LabeledContent("Name", value: profile.baby_name ?? "—")
                        LabeledContent("Birthday", value: profile.baby_birthdate ?? "—")
                    }
                }

                Section("Preferences") {
                    Stepper(
                        "Feeding reminder: \(feedIntervalHours, specifier: "%.1f")h",
                        value: $feedIntervalHours,
                        in: 0.5...6.0,
                        step: 0.5
                    )
                }

                Section("Household") {
                    if let inviteToken {
                        LabeledContent("Invite code") {
                            Text(inviteToken).font(.caption.monospaced())
                        }
                        ShareLink(item: "Join my household with code: \(inviteToken)")
                    } else {
                        Button {
                            Task { await generateInvite() }
                        } label: {
                            if isGeneratingInvite { ProgressView() }
                            else { Text("Generate invite code") }
                        }
                        .disabled(isGeneratingInvite)
                    }
                }

                Section {
                    Button(role: .destructive) {
                        Task { await auth.signOut() }
                    } label: {
                        Text("Sign out")
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func generateInvite() async {
        guard let householdId = auth.profile?.household_id,
              let userId = auth.profile?.id else { return }
        isGeneratingInvite = true
        defer { isGeneratingInvite = false }
        do {
            let invite = try await SupabaseService.shared.createInvite(
                householdId: householdId,
                userId: userId
            )
            inviteToken = invite.token
        } catch {
            // Surface in UI later; silent for now.
        }
    }
}

import SwiftUI
import Supabase

struct OnboardingView: View {
    let user: User

    @Environment(AuthStore.self) private var auth
    @State private var babyName: String = ""
    @State private var babyDOB: Date = .now
    @State private var gender: String = ""
    @State private var inviteToken: String = ""
    @State private var saving: Bool = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Baby") {
                    TextField("Name", text: $babyName)
                        .textInputAutocapitalization(.words)
                    DatePicker("Birthdate", selection: $babyDOB, in: ...Date(), displayedComponents: .date)
                    Picker("Gender", selection: $gender) {
                        Text("Prefer not to say").tag("")
                        Text("Boy").tag("boy")
                        Text("Girl").tag("girl")
                    }
                }
                Section {
                    TextField("Paste invite code (optional)", text: $inviteToken)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } footer: {
                    Text("Have an invite from your partner? Paste it to join their household.")
                }

                if let err = errorMessage {
                    Text(err).foregroundStyle(.red)
                }

                Section {
                    Button {
                        Task { await save() }
                    } label: {
                        if saving { ProgressView() } else { Text("Continue") }
                    }
                    .disabled(babyName.trimmingCharacters(in: .whitespaces).isEmpty || saving)
                }
            }
            .navigationTitle("Welcome")
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        errorMessage = nil

        // TODO: If inviteToken is non-empty, redeem via a dedicated RPC or API.
        //       Skipping the join-household flow for this MVP; single-user case works.

        do {
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withFullDate]
            let fields: [String: AnyJSON] = [
                "baby_name": .string(babyName),
                "baby_birthdate": .string(iso.string(from: babyDOB)),
                "baby_gender": gender.isEmpty ? .null : .string(gender),
                "onboarding_done": .bool(true),
            ]
            let updated = try await SupabaseService.shared.updateProfile(
                userId: user.id.uuidString,
                fields: fields
            )
            auth.profile = updated
            await auth.refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

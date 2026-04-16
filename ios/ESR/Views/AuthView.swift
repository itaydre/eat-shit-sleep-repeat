import SwiftUI

struct AuthView: View {
    @Environment(AuthStore.self) private var auth
    @State private var email: String = ""
    @State private var sent: Bool = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Text("🍼")
                .font(.system(size: 72))
            VStack(spacing: 6) {
                Text("Eat Shit Sleep Repeat")
                    .font(.title2.weight(.bold))
                Text("Sign in to sync with your household.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if sent {
                ContentUnavailableView(
                    "Check your inbox",
                    systemImage: "envelope.badge",
                    description: Text("We emailed you a magic link. Tap it to sign in.")
                )
            } else {
                VStack(spacing: 12) {
                    TextField("your@email.com", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding()
                        .background(.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))

                    Button {
                        Task {
                            await auth.signIn(email: email)
                            sent = auth.errorMessage == nil
                        }
                    } label: {
                        Text("Send magic link")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(email.contains("@") == false)

                    if let err = auth.errorMessage {
                        Text(err)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                .padding(.horizontal)
            }

            Spacer()
        }
        .padding()
    }
}

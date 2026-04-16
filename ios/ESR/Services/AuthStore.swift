import Foundation
import Observation
import Supabase

/// Owns the authenticated session + profile. Views observe this to decide
/// whether to render the auth wall, the onboarding form, or the app.
@Observable
@MainActor
final class AuthStore {
    enum State: Equatable {
        case unknown
        case signedOut
        case signedIn(User)
        case onboarding(User)
    }

    var state: State = .unknown
    var profile: Profile?
    var errorMessage: String?

    private var authTask: Task<Void, Never>?

    /// Begin listening for auth state changes. Call once on app start.
    func start() {
        authTask?.cancel()
        authTask = Task { [weak self] in
            guard let self else { return }
            for await change in await SupabaseService.shared.client.auth.authStateChanges {
                await self.apply(session: change.session)
            }
        }
        Task { await self.refresh() }
    }

    func refresh() async {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            await apply(session: session)
        } catch {
            state = .signedOut
            profile = nil
        }
    }

    func signIn(email: String) async {
        errorMessage = nil
        do {
            try await SupabaseService.shared.signInWithMagicLink(email: email)
        } catch {
            errorMessage = "Couldn't send magic link: \(error.localizedDescription)"
        }
    }

    func handleDeepLink(_ url: URL) async {
        do { try await SupabaseService.shared.handleAuthCallback(url: url) }
        catch { errorMessage = "Sign-in link was invalid or expired." }
    }

    func signOut() async {
        try? await SupabaseService.shared.signOut()
        state = .signedOut
        profile = nil
    }

    private func apply(session: Session?) async {
        guard let session else {
            state = .signedOut
            profile = nil
            return
        }
        let user = session.user
        do {
            let loaded = try await SupabaseService.shared.fetchProfile(userId: user.id.uuidString)
            profile = loaded
            if let loaded, loaded.onboarding_done == true {
                state = .signedIn(user)
            } else {
                state = .onboarding(user)
            }
        } catch {
            state = .onboarding(user)
            profile = nil
        }
    }
}

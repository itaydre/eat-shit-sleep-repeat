import SwiftUI

struct RootView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        Group {
            switch auth.state {
            case .unknown:
                ProgressView().controlSize(.large)
            case .signedOut:
                AuthView()
            case .onboarding(let user):
                OnboardingView(user: user)
            case .signedIn:
                HomeView()
            }
        }
        .animation(.default, value: auth.state)
    }
}

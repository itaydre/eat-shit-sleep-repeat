import SwiftUI

@main
struct ESRApp: App {
    @State private var auth = AuthStore()
    @State private var entries = EntriesStore()
    @State private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(entries)
                .environment(session)
                .task { auth.start() }
                .onOpenURL { url in
                    Task { await auth.handleDeepLink(url) }
                }
        }
    }
}

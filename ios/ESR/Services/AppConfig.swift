import Foundation

/// Environment-driven config. Set SUPABASE_URL and SUPABASE_ANON_KEY as Info.plist
/// entries in release builds (or hard-code them below for local dev).
enum AppConfig {
    /// Fill these in with the same values your web client uses.
    /// Keep them OUT of git for release builds — inject via xcconfig / Info.plist.
    static let supabaseURL: URL = {
        if let str = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
           let url = URL(string: str) {
            return url
        }
        return URL(string: "https://djdbsmwyfoujhxlmmmpr.supabase.co")!
    }()

    static let supabaseAnonKey: String = {
        if let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
           !key.isEmpty {
            return key
        }
        // TODO: paste your anon key here for local dev, or add it to Info.plist.
        return ""
    }()

    /// The URL scheme (registered in project.yml) the magic-link deep link bounces back into.
    static let authRedirectURL = URL(string: "esr://auth-callback")!

    /// Long-running feed / pump session alert threshold.
    static let longSessionThreshold: TimeInterval = 20 * 60

    /// Rows fetched in a single /logs GET.
    static let maxFetchRows = 500
}

import Foundation
import Supabase

/// Thin wrapper around the Supabase Swift SDK with the two tables we care about.
/// All queries use the anon key + the user's JWT, so RLS policies enforce
/// tenancy (make sure `household_id` policies from the web migration are in
/// place before you rely on this).
actor SupabaseService {
    static let shared = SupabaseService()

    let client: SupabaseClient

    private init() {
        self.client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    storage: nil,
                    flowType: .pkce,
                    autoRefreshToken: true
                )
            )
        )
    }

    // MARK: - Auth

    func signInWithMagicLink(email: String) async throws {
        try await client.auth.signInWithOTP(
            email: email,
            redirectTo: AppConfig.authRedirectURL
        )
    }

    func handleAuthCallback(url: URL) async throws {
        try await client.auth.session(from: url)
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }

    // MARK: - Profile

    func fetchProfile(userId: String) async throws -> Profile? {
        let profile: Profile = try await client.database
            .from("profiles")
            .select()
            .eq("id", value: userId)
            .single()
            .execute()
            .value
        return profile
    }

    func updateProfile(userId: String, fields: [String: AnyJSON]) async throws -> Profile {
        try await client.database
            .from("profiles")
            .update(fields)
            .eq("id", value: userId)
            .select()
            .single()
            .execute()
            .value
    }

    // MARK: - Invites

    struct InviteToken: Codable { let token: String; let expires_at: String }

    func createInvite(householdId: String, userId: String) async throws -> InviteToken {
        let token = UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(22).lowercased()
        let expires = Date().addingTimeInterval(24 * 3600).ISO8601Format()
        let row: [String: AnyJSON] = [
            "token": .string(String(token)),
            "household_id": .string(householdId),
            "created_by": .string(userId),
            "expires_at": .string(expires),
        ]
        try await client.database
            .from("household_invites")
            .insert(row)
            .execute()
        return InviteToken(token: String(token), expires_at: expires)
    }

    // MARK: - Logs

    func fetchLogs(householdId: String) async throws -> [Entry] {
        try await client.database
            .from("baby_logs")
            .select()
            .eq("household_id", value: householdId)
            .order("timestamp", ascending: false)
            .limit(AppConfig.maxFetchRows)
            .execute()
            .value
    }

    func insertLog(entry: Entry) async throws -> Entry {
        try await client.database
            .from("baby_logs")
            .insert(entry)
            .select()
            .single()
            .execute()
            .value
    }

    func patchLog(id: Int64, fields: [String: AnyJSON], householdId: String) async throws -> Entry {
        try await client.database
            .from("baby_logs")
            .update(fields)
            .eq("id", value: id)
            .eq("household_id", value: householdId)
            .select()
            .single()
            .execute()
            .value
    }

    func deleteLog(id: Int64, householdId: String) async throws {
        try await client.database
            .from("baby_logs")
            .delete()
            .eq("id", value: id)
            .eq("household_id", value: householdId)
            .execute()
    }
}

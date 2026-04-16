import Foundation

struct Profile: Codable, Hashable {
    let id: String
    var baby_name: String?
    var baby_birthdate: String?     // yyyy-MM-dd or ISO 8601
    var baby_birth_weight: Int?
    var baby_gender: String?        // "boy" | "girl" | nil
    var household_id: String?
    var onboarding_done: Bool?
}

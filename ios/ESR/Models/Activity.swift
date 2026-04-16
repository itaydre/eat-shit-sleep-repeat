import SwiftUI

enum Activity: String, CaseIterable, Identifiable, Codable {
    case pee
    case poop
    case feed_l
    case feed_r
    case pump
    case pump_fridge
    case pump_freezer

    var id: String { rawValue }

    var label: String {
        switch self {
        case .pee: return "Pee"
        case .poop: return "Poop"
        case .feed_l: return "Feed L"
        case .feed_r: return "Feed R"
        case .pump, .pump_fridge, .pump_freezer: return "Pump"
        }
    }

    var emoji: String {
        switch self {
        case .pee: return "💦"
        case .poop: return "💩"
        case .feed_l, .feed_r: return "🤱"
        case .pump, .pump_fridge, .pump_freezer: return "🍼"
        }
    }

    /// Foreground / accent color for the tile.
    var tint: Color {
        switch self {
        case .pee: return Color(red: 0.231, green: 0.419, blue: 0.769)
        case .poop: return Color(red: 0.627, green: 0.419, blue: 0.180)
        case .feed_l, .feed_r: return Color(red: 0.180, green: 0.541, blue: 0.180)
        case .pump, .pump_fridge, .pump_freezer: return Color(red: 0.419, green: 0.310, blue: 0.627)
        }
    }

    /// Soft pastel tile background.
    var tileBackground: Color {
        switch self {
        case .pee: return Color(red: 0.890, green: 0.933, blue: 1.000)
        case .poop: return Color(red: 1.000, green: 0.929, blue: 0.811)
        case .feed_l, .feed_r: return Color(red: 0.870, green: 0.980, blue: 0.870)
        case .pump, .pump_fridge, .pump_freezer: return Color(red: 0.952, green: 0.933, blue: 1.000)
        }
    }

    /// Home tiles shown in the grid (collapses pump variants into a single tile).
    static var homeTiles: [Activity] { [.pee, .poop, .feed_l, .feed_r, .pump] }

    var isFeed: Bool { self == .feed_l || self == .feed_r }
    var isPump: Bool {
        self == .pump || self == .pump_fridge || self == .pump_freezer
    }
    var isSessionBased: Bool { isFeed || isPump }

    /// For mirroring the Feed L emoji.
    var flipEmojiHorizontally: Bool { self == .feed_l }
}

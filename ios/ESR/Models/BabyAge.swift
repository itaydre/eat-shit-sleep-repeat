import Foundation

/// Mirrors lib/baby-log.js computeBabyAge / formatBabyAge.
/// Uses actual-month arithmetic (not days/30) so the "1 month 4 days" label
/// lines up with the parents' intuition on odd month lengths.
enum BabyAgeUnit: String { case days, weeks, months }

struct BabyAge: Equatable {
    let unit: BabyAgeUnit
    let value: Int
    let fraction: Int

    static func compute(birth: Date, now: Date = .now, calendar: Calendar = .current) -> BabyAge {
        let totalSeconds = max(0, now.timeIntervalSince(birth))
        let totalHours = Int(totalSeconds / 3600)
        let days = totalHours / 24

        if days < 7 {
            return BabyAge(unit: .days, value: days, fraction: totalHours % 24)
        }
        if days < 30 {
            return BabyAge(unit: .weeks, value: days / 7, fraction: days % 7)
        }

        let comps = calendar.dateComponents([.year, .month, .day], from: birth, to: now)
        var months = (comps.year ?? 0) * 12 + (comps.month ?? 0)
        if (comps.day ?? 0) < 0 { months -= 1 }
        // Anniversary of the birthdate `months` months later.
        guard let anniversary = calendar.date(byAdding: .month, value: months, to: birth) else {
            return BabyAge(unit: .months, value: months, fraction: 0)
        }
        let extraDays = calendar.dateComponents([.day], from: anniversary, to: now).day ?? 0
        return BabyAge(unit: .months, value: max(0, months), fraction: max(0, extraDays))
    }

    func formatted(gender: String?) -> String {
        let emoji: String
        switch gender {
        case "boy": emoji = "👦 "
        case "girl": emoji = "👧 "
        default: emoji = ""
        }
        switch unit {
        case .days:
            return "\(emoji)\(value).\(fraction) days old"
        case .weeks:
            return "\(emoji)\(value).\(fraction) \(value == 1 ? "week" : "weeks") old"
        case .months:
            return "\(emoji)\(value).\(fraction) \(value == 1 ? "month" : "months") old"
        }
    }
}

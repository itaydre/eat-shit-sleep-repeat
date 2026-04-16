import SwiftUI

/// Horizontal strip of day pills at the bottom. Tap to jump; native swipe
/// scrolls, and the centered pill is tracked so the selected offset stays
/// in sync with what the user visually focused on.
struct DayStripView: View {
    @Binding var selectedOffset: Int
    private let pastDays = 60

    var body: some View {
        GeometryReader { geo in
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach((-pastDays...0).reversed(), id: \.self) { offset in
                            DayPill(offset: offset, isActive: offset == selectedOffset)
                                .id(offset)
                                .onTapGesture {
                                    withAnimation(.snappy) {
                                        selectedOffset = offset
                                        proxy.scrollTo(offset, anchor: .center)
                                    }
                                }
                        }
                    }
                    .padding(6)
                }
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .strokeBorder(Color.primary.opacity(0.06))
                )
                .onAppear {
                    proxy.scrollTo(selectedOffset, anchor: .center)
                }
                .onChange(of: selectedOffset) { _, new in
                    withAnimation(.snappy) {
                        proxy.scrollTo(new, anchor: .center)
                    }
                }
            }
            .frame(height: geo.size.height)
        }
        .frame(height: 64)
    }
}

private struct DayPill: View {
    let offset: Int
    let isActive: Bool

    var body: some View {
        let date = Calendar.current.date(byAdding: .day, value: offset, to: .now) ?? .now
        VStack(spacing: 2) {
            Text(Self.dowFormatter.string(from: date))
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text("\(Calendar.current.component(.day, from: date))")
                .font(.title3.weight(.bold))
                .monospacedDigit()
                .foregroundStyle(.primary)
        }
        .frame(width: 44, height: 50)
        .background(
            isActive
            ? Color(.secondarySystemFill)
            : Color.clear,
            in: RoundedRectangle(cornerRadius: 12)
        )
        .contentShape(Rectangle())
    }

    private static let dowFormatter: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "EEE"
        return df
    }()
}

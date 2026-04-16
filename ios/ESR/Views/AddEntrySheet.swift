import SwiftUI

struct AddEntrySheet: View {
    let onSave: (Activity, Date) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var activity: Activity = .pee
    @State private var when: Date = .now

    var body: some View {
        NavigationStack {
            Form {
                Picker("Activity", selection: $activity) {
                    ForEach(Activity.homeTiles) { a in
                        HStack {
                            Text(a.emoji)
                            Text(a.label)
                        }.tag(a)
                    }
                }
                DatePicker("When", selection: $when, in: ...Date())
                Button("Add") {
                    onSave(activity, when)
                    dismiss()
                }
            }
            .navigationTitle("Add past entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

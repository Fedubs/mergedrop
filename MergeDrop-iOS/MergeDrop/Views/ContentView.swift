import SwiftUI

struct ContentView: View {
    @State private var apiStatus = "Checking..."
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "app.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                
                Text("MergeDrop")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("API: \(apiStatus)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("Start building your iOS app here.")
                    .foregroundColor(.secondary)
            }
            .padding()
            .navigationTitle("MergeDrop")
            .task { await checkAPI() }
        }
    }
    
    func checkAPI() async {
        guard let url = URL(string: APIConfig.baseURL + "/health") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let status = json["status"] as? String { apiStatus = status }
        } catch { apiStatus = "Offline" }
    }
}

#Preview { ContentView() }

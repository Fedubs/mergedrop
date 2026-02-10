import Foundation

struct APIConfig {
    #if DEBUG
    static let baseURL = "http://localhost:3001/api"
    #else
    static let baseURL = "https://your-production-url.com/api"
    #endif
}

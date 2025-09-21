//
//  DanmuMessage.swift
//  TeamsDanmu
//
//  Created by miku1958 on 2025/9/18.
//

import Foundation

// Danmu message data structure
struct DanmuMessage: Codable {
    let name: String           // Username
    let avatar: String?        // Avatar base64 data
    let content: String        // Message content
    let timestamp: String      // Original timestamp
}

// Data structure received from client
struct ReceivedDanmuData: Codable {
    let type: String
    let data: ReceivedMessageData
}

struct ReceivedMessageData: Codable {
    let name: String
    let avatar: String?
    let content: String
    let timestamp: String
}

// 扩展用于格式化显示
extension DanmuMessage {
    var hasAvatar: Bool {
        return avatar != nil && !(avatar?.isEmpty ?? true)
    }
}

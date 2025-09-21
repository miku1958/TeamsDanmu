//
//  DanmuServer.swift
//  TeamsDanmu
//
//  Created by miku1958 on 2025/9/18.
//

import Foundation
import Network

class DanmuServer {
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "DanmuServer")
    
    var onMessageReceived: ((DanmuMessage) -> Void)?
    
    func start(port: UInt16 = 80) throws {
        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true
        
        listener = try NWListener(using: parameters, on: NWEndpoint.Port(integerLiteral: port))
        
        listener?.newConnectionHandler = { [weak self] connection in
            self?.handleConnection(connection)
        }
        
        listener?.start(queue: queue)
    }
    
    func stop() {
        listener?.cancel()
        listener = nil
    }
    
    private func handleConnection(_ connection: NWConnection) {
        connection.start(queue: queue)
        
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, error in
            if let data = data, !data.isEmpty {
                self?.processHTTPRequest(data: data, connection: connection)
            }
            
            if isComplete {
                connection.cancel()
            }
        }
    }
    
    private func processHTTPRequest(data: Data, connection: NWConnection) {
        let request = String(data: data, encoding: .utf8)!
        let lines = request.components(separatedBy: "\r\n")
        let firstLine = lines.first!
        let components = firstLine.components(separatedBy: " ")
        let method = components[0]
        let path = components[1]
        
        if method == "OPTIONS" {
            sendCORSResponse(connection: connection)
            return
        }
        
        if method == "POST" && path == "/teams/danmu" {
            handleDanmuRequest(request: request, connection: connection)
        } else {
            sendOKResponse(connection: connection)
        }
    }
    
    private func handleDanmuRequest(request: String, connection: NWConnection) {
        let jsonData = extractJSONFromHTTPRequest(request)!
        let decoder = JSONDecoder()
		let receivedData = try! decoder.decode(ReceivedDanmuData.self, from: jsonData).data

        let message = DanmuMessage(
            name: receivedData.name,
            avatar: receivedData.avatar,
            content: receivedData.content,
            timestamp: receivedData.timestamp,
        )
        
        DispatchQueue.main.async { [weak self] in
            self?.onMessageReceived?(message)
        }
        
        sendOKResponse(connection: connection)
    }
    
    private func extractJSONFromHTTPRequest(_ request: String) -> Data? {
        let lines = request.components(separatedBy: "\r\n")
        
        var foundEmptyLine = false
        var jsonString = ""
        
        for line in lines {
            if foundEmptyLine {
                jsonString += line
            } else if line.isEmpty {
                foundEmptyLine = true
            }
        }
        
        return jsonString.data(using: .utf8)
    }
    
    private func sendCORSResponse(connection: NWConnection) {
        let response = "HTTP/1.1 200 OK\r\n" +
                      "Access-Control-Allow-Origin: *\r\n" +
                      "Access-Control-Allow-Methods: POST, OPTIONS\r\n" +
                      "Access-Control-Allow-Headers: Content-Type\r\n" +
                      "\r\n"
        
        let data = response.data(using: .utf8)!
        connection.send(content: data, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }
    
    private func sendOKResponse(connection: NWConnection) {
        let response = "HTTP/1.1 200 OK\r\n" +
                      "Access-Control-Allow-Origin: *\r\n" +
                      "Content-Type: application/json\r\n" +
                      "Content-Length: 15\r\n" +
                      "\r\n" +
                      "{\"success\":true}"
        
        let data = response.data(using: .utf8)!
        connection.send(content: data, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }
}

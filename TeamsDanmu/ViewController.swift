//
//  ViewController.swift
//  TeamsDanmu
//
//  Created by miku1958 on 2025/9/18.
//

import Cocoa

class ViewController: NSViewController {
    private let danmuServer = DanmuServer()
	private let danmuContainerView = NSStackView()
	private var scrollingTimer: CADisplayLink?
	private var danmuViews: [DanmuView] = [] {
		didSet {
			scrollingTimer?.isPaused = danmuViews.isEmpty
		}
	}

	private let timestampFormatter = ISO8601DateFormatter()

    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupServer()
        startServer()
		danmuContainerView.frame.size = view.frame.size
		danmuContainerView.autoresizingMask = [.width, .height]
		view.addSubview(danmuContainerView)

		danmuContainerView.spacing = 0
		danmuContainerView.distribution = .fillEqually
		danmuContainerView.orientation = .vertical
		danmuContainerView.alignment = .leading

		for _ in 0..<30 {
			danmuContainerView.addArrangedSubview(NSView())
		}
		timestampFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    }

	override func viewDidAppear() {
		guard
			let window = view.window,
			let screen = NSScreen.screens.first(where: {
				$0.localizedName == "VG271U M"
			})
		else {
			return
		}
		window.setFrame(screen.visibleFrame, display: true)
		window.styleMask = [.borderless, .fullSizeContentView]
		window.isOpaque = false
		window.backgroundColor = .clear
		window.level = .init(Int(CGWindowLevelKey.desktopWindow.rawValue))

		scrollingTimer = screen.displayLink(target: self, selector: #selector(moveDanmus))
		scrollingTimer?.isPaused = true
		scrollingTimer?.add(to: .main, forMode: .common)
	}

    private func setupServer() {
        danmuServer.onMessageReceived = { [weak self] message in
			guard let self = self else {
				return
			}
			let sinceNow = self.timestampFormatter.date(from: message.timestamp)?.timeIntervalSinceNow ?? -.greatestFiniteMagnitude
			print("Received danmu since Now: \(sinceNow)")
			guard sinceNow > -60 else {
				return
			}
			print("New danmu: \(message.name): \(message.content)")
            let danmuView = DanmuView(danmu: message)
			danmuContainerView.views.first {
				$0.subviews.isEmpty || $0.subviews.allSatisfy {
					$0.frame.maxX < self.view.frame.width - 40
				}
			}?.addSubview(danmuView)
			danmuView.frame.origin.x = self.view.frame.width

			danmuViews.append(danmuView)
        }
    }
    
    private func startServer() {
        try! danmuServer.start(port: 8080)
        print("Danmu server started, listening on port 8080")
    }
    
    deinit {
        danmuServer.stop()
    }

	@objc private func moveDanmus() {
		for index in danmuViews.indices.reversed() {
			let danmuView = danmuViews[index]
			danmuView.frame.origin.x -= 1
			if danmuView.frame.maxX < 0 {
				danmuView.removeFromSuperview()
				danmuViews.remove(at: index)
			}
		}
	}
}


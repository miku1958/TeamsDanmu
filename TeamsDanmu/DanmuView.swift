//
//  DanmuView.swift
//  TeamsDanmu
//
//  Created by miku1958 on 2025/9/18.
//

import Foundation
import AppKit

let DanmuViewHeight: CGFloat = 32

class DanmuView: NSStackView {
	let avatarView = NSImageView()
	let commentView = NSTextView()

	init(danmu: DanmuMessage) {
		super.init(frame: .zero)
		spacing = 10
		distribution = .fillProportionally
		alignment = .centerY
		avatarView.image = NSImage(data: Data(base64Encoded: danmu.avatar?.data(using: .utf8) ?? Data()) ?? Data())
		
		// Set avatar to circular shape
		avatarView.wantsLayer = true
		avatarView.layer?.masksToBounds = true
		avatarView.layer?.cornerRadius = DanmuViewHeight / 2

		commentView.string = danmu.content.trimmingCharacters(in: CharacterSet.punctuationCharacters.union(.whitespacesAndNewlines).union(.illegalCharacters))
		commentView.backgroundColor = .clear
		commentView.shadow = NSShadow()
		commentView.shadow?.shadowColor = .black
		commentView.shadow?.shadowBlurRadius = 2

		addArrangedSubview(avatarView)
		addArrangedSubview(commentView)

		guard var size = commentView.textStorage?.boundingRect(with: CGSize(width: 1000, height: DanmuViewHeight)).size else {
			return
		}

		NSLayoutConstraint.activate([
			avatarView.widthAnchor.constraint(equalToConstant: DanmuViewHeight),
			avatarView.heightAnchor.constraint(equalToConstant: DanmuViewHeight),
			commentView.heightAnchor.constraint(equalToConstant: size.height),
		])

		size.height = DanmuViewHeight
		size.width += DanmuViewHeight + spacing + 50

		self.frame.size = size
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}

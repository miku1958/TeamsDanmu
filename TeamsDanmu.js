// ==UserScript==
// @name         TeamsDanmu
// @namespace    http://tampermonkey.net/
// @version      2025-09-18
// @description  try to take over the world!
// @author       You
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @match        https://teams.microsoft.com/v2/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=microsoft.com
// ==/UserScript==

/**
 * @type {Map<string, string>}
 */
const avatarCache = new Map();

// Monitor chat panel for new messages
function monitorChatPane() {
  const chatPaneList = document.getElementById("chat-pane-list");

  if (!chatPaneList) {
    console.error("chat-pane-list element not found");
    return;
  }

  // Store processed messages to avoid duplicate processing
  const processedItems = new Set();

  // Function to download image and convert to base64
  async function downloadImageAsBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Failed to download avatar:", error);
      return null;
    }
  }

  // Recursive function to extract chat content
  /**
   * @param {HTMLElement} messageElement
   * @returns {Promise<string>}
   */
  async function extractAvatar(messageElement) {
    return new Promise((resolve) => {
      function _extractAvatar() {
        const avatarElement = messageElement.querySelector(
          '[id^="avatar-"] > img'
        );
        if (
          avatarElement == null ||
          avatarElement.src.includes("data:image/svg+xml;base64")
        ) {
          setTimeout(() => {
            _extractAvatar();
          }, 100);
          return;
        }
        resolve(avatarElement.src);
      }
      _extractAvatar();
    });
  }

  // Process new chat items
  /**
   * Process chat item
   * @param {HTMLElement} item
   * @returns {Promise<void>}
   */
  async function processChatItem(_item) {
    const item = _item.cloneNode(true);

    item.querySelectorAll('[data-tid="quoted-reply-card"]').forEach((card) => {
      card.remove();
    });

    item.querySelectorAll('[data-testid="atp-safelink"]').forEach((card) => {
      card.remove();
    });

    item.querySelectorAll('.fui-ChatMessage__reactions').forEach((card) => {
      card.remove();
    });

    item
      .querySelectorAll('[data-testid="componentUXWrapperTestId"]')
      .forEach((card) => {
        card.remove();
      });
    // Generate unique identifier to avoid duplicate processing
    const itemHash =
      item.outerHTML.length + "_" + (item.textContent || "").slice(0, 50);

    if (processedItems.has(itemHash)) {
      return; // Already processed, skip
    }

    try {
      // 提取名字
      const nameElement = item.querySelector(
        '[data-tid="message-author-name"]'
      );
      if (nameElement == null) {
        return;
      }
      const name = nameElement.textContent.trim();

      let avatarBase64 = null;
      if (avatarCache.has(name)) {
        avatarBase64 = avatarCache.get(name);
      } else {
        // Extract avatar - use general selector to match elements with id starting with avatar-
        const avatarSrc = await extractAvatar(item);

        // Download avatar and convert to base64 (if avatar exists)
        if (avatarSrc) {
          console.log("Starting avatar download:", avatarSrc);
          avatarBase64 = await downloadImageAsBase64(avatarSrc);
          if (avatarBase64) {
            // Remove data:image/xxx;base64, prefix, keep only pure base64 data
            const base64Index = avatarBase64.indexOf(",");
            if (base64Index !== -1) {
              avatarBase64 = avatarBase64.substring(base64Index + 1);
            }
            console.log("Avatar download successful, converted to base64");
          }
        }
        if (avatarBase64 == null) {
          console.warn("Avatar download failed or does not exist");
          return;
        }
        avatarCache.set(name, avatarBase64);
      }

      // Extract chat content
      const messageElement = item.querySelector(
        '[data-tid="chat-pane-message"]'
      );
      if (messageElement == null) {
        return;
      }
      const chatContent = messageElement.textContent.trim();

      // Extract timestamp
      const timeElement = item.querySelector("time");
      let timestamp = "";

      if (timeElement) {
        // Prioritize using datetime attribute, which is standard ISO format time
        if (timeElement.hasAttribute("datetime")) {
          timestamp = timeElement.getAttribute("datetime");
        }
      }

      // Output extracted data
      const messageData = {
        name: name,
        avatar: avatarBase64,
        content: chatContent,
        timestamp: timestamp,
      };

      console.log("New message:", messageData);

      // Mark as processed
      processedItems.add(itemHash);

      // You can add custom processing logic here
      // For example: call callback function, send to server, show notification, etc.
      if (typeof onNewMessage === "function") {
        onNewMessage(messageData);
      }
    } catch (error) {
      console.error("Error processing chat item:", error);
    }
  }

  // Use MutationObserver to monitor DOM changes
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      // Check added nodes
      mutation.addedNodes.forEach(function (node) {
        // Ensure it's an element node
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if it's a chat item
          if (node.dataset && node.dataset.tid === "chat-pane-item") {
            processChatItem(node).catch((error) => {
              console.error("Failed to process chat item async operation:", error);
            });
          }

          // Also check if there are chat items in child elements
          const chatItems = node.querySelectorAll(
            '[data-tid="chat-pane-item"]'
          );
          chatItems.forEach((chatItem) => {
            processChatItem(chatItem).catch((error) => {
              console.error("Failed to process chat item async operation:", error);
            });
          });
        }
      });
    });
  });

  // Start observing
  observer.observe(chatPaneList, {
    childList: true,
    subtree: true,
  });

  // Process existing chat items when page loads
  const existingItems = chatPaneList.querySelectorAll(
    '[data-tid="chat-pane-item"]'
  );
  existingItems.forEach((chatItem) => {
    processChatItem(chatItem).catch((error) => {
      console.error("Failed to process existing chat item async operation:", error);
    });
  });

  console.log("Chat monitoring started");

  // Return function to stop monitoring
  return function stopMonitoring() {
    observer.disconnect();
    processedItems.clear();
    console.log("Chat monitoring stopped");
  };
}

// Optional: Define message processing callback function
async function onNewMessage(messageData) {
  // Process new messages here
  console.log("Processing new message:", messageData.name, "says:", messageData.content);

  // If there's base64 avatar data, you can use it here
  if (messageData.avatar) {
    console.log("Avatar base64 data length:", messageData.avatar.length);
  }

  // Send message data to server
  try {
    const postData = {
      type: "teams_danmu",
      data: messageData,
    };

    GM_xmlhttpRequest({
      method: "POST",
      url: "http://localhost:8080/teams/danmu",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(postData),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          console.log("Message successfully sent to server");
        } else {
          console.error(
            "Failed to send message to server:",
            response.status,
            response.statusText
          );
        }
      },
      onerror: function (response) {
        console.error("Error sending message to server:", response.statusText);
      },
    });
  } catch (error) {
    console.error("Error sending message to server:", error);
  }
}

let currentMonitor = null;

// Monitor the appearance and reconstruction of chat-pane-list element
function startChatPaneMonitoring() {
  // Try to start immediately first
  const chatPaneList = document.getElementById("chat-pane-list");
  if (chatPaneList) {
    console.log("Found chat-pane-list, starting danmu monitoring");
    if (currentMonitor) {
      currentMonitor(); // Stop previous monitoring
    }
    currentMonitor = monitorChatPane();
  }

  // Use MutationObserver to monitor changes in the entire document
  const documentObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      // Check added nodes
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if it's the chat-pane-list element
          if (node.id === "chat-pane-list") {
            console.log("Detected chat-pane-list being added, starting danmu monitoring");
            if (currentMonitor) {
              currentMonitor(); // Stop previous monitoring
            }
            currentMonitor = monitorChatPane();
          }
          // Also check if there's chat-pane-list in child elements
          else {
            const chatPaneList = node.querySelector("#chat-pane-list");
            if (chatPaneList) {
              console.log(
                "Detected chat-pane-list found in new node, starting danmu monitoring"
              );
              if (currentMonitor) {
                currentMonitor(); // Stop previous monitoring
              }
              currentMonitor = monitorChatPane();
            }
          }
        }
      });

      // Check removed nodes
      mutation.removedNodes.forEach(function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // If chat-pane-list was removed
          if (
            node.id === "chat-pane-list" ||
            (node.querySelector && node.querySelector("#chat-pane-list"))
          ) {
            console.log("Detected chat-pane-list being removed, stopping danmu monitoring");
            if (currentMonitor) {
              currentMonitor(); // Stop monitoring
              currentMonitor = null;
            }
          }
        }
      });
    });
  });

  // Start observing changes in the entire document
  documentObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("Started monitoring the appearance and changes of chat-pane-list");
}

(function () {
  "use strict";

  // Wait for page to fully load before starting monitoring
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startChatPaneMonitoring);
  } else {
    startChatPaneMonitoring();
  }
})();

if (
  typeof GM_xmlhttpRequest === "undefined" &&
  typeof GM === "object" &&
  typeof GM.xmlHttpRequest === "function"
) {
  GM_xmlhttpRequest = GM.xmlHttpRequest;
}

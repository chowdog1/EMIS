// EMIS/public/js/chatbox.js
class ChatWindow {
  constructor(user, chatboxManager, index) {
    this.user = user;
    this.chatboxManager = chatboxManager;
    this.container = null;
    this.minimized = false;
    this.messages = [];
    this.socket = chatboxManager.socket;
    this.userId = chatboxManager.userId;
    this.index = index;
    this.typingTimeout = null;
    this.isTyping = false;
    this.isActive = true; // Track if this window is active
    this.lastSeenMessageId = null; // Track the last seen message ID
    this.unreadCount = 0; // Track unread messages for this user
    this.blinkInterval = null; // For blinking effect
    console.log("Creating ChatWindow for user:", user);
    this.init();
  }
  init() {
    console.log("Initializing ChatWindow");
    this.createChatWindow();
    this.loadMessages();
    this.setupSocketListeners();
    this.requestNotificationPermission(); // Request notification permission on init
  }
  requestNotificationPermission() {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
      console.log("Browser doesn't support notifications");
      return;
    }
    // Request permission if not granted or denied
    if (Notification.permission === "default") {
      console.log("Requesting notification permission...");
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
        if (permission === "granted") {
          this.showTestNotification();
        }
      });
    } else if (Notification.permission === "granted") {
      console.log("Notification permission already granted");
      this.showTestNotification();
    } else {
      console.log("Notification permission denied");
    }
  }
  showTestNotification() {
    // Show a test notification to verify it works
    console.log("Showing test notification...");
    try {
      const notification = new Notification("Test Notification", {
        body: "Notifications are working!",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "test-notification",
      });
      notification.onclick = () => {
        console.log("Test notification clicked");
        notification.close();
      };
      // Auto close after 3 seconds
      setTimeout(() => {
        notification.close();
      }, 3000);
      console.log("Test notification shown successfully");
    } catch (error) {
      console.error("Error showing test notification:", error);
    }
  }
  createChatWindow() {
    console.log("Creating chat window DOM elements");
    // Create container
    this.container = document.createElement("div");
    this.container.className = "chat-window";
    this.container.style.position = "fixed";
    this.container.style.bottom = "0";
    this.container.style.width = "250px";
    this.container.style.height = this.minimized ? "30px" : "350px";
    this.container.style.backgroundColor = "#fff";
    this.container.style.border = "1px solid #ccc";
    this.container.style.borderRadius = "3px";
    this.container.style.boxShadow = "0 1px 1px rgba(0,0,0,0.2)";
    this.container.style.zIndex = "9999";
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.transition = "height 0.2s ease, right 0.3s ease";
    // Create header with proper structure to avoid overlapping
    const header = document.createElement("div");
    header.style.backgroundColor = "#2d5a27"; // Dark green
    header.style.color = "white";
    header.style.padding = "5px 10px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.cursor = "pointer";
    header.style.borderRadius = "3px 3px 0 0";
    header.style.position = "relative"; // For badge positioning
    // Left section: Title and badge
    const leftSection = document.createElement("div");
    leftSection.style.display = "flex";
    leftSection.style.alignItems = "center";
    leftSection.style.flex = "1";
    leftSection.style.minWidth = "0"; // Allows flex item to shrink below content size
    leftSection.style.marginRight = "10px"; // Space between title and buttons
    // Title with truncation
    const title = document.createElement("div");
    title.textContent = `${this.user.firstname} ${this.user.lastname}`;
    title.style.fontWeight = "bold";
    title.style.fontSize = "12px";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.flex = "1";
    title.style.minWidth = "0";
    leftSection.appendChild(title);
    // Unread badge positioned absolutely to avoid affecting layout
    this.unreadBadge = document.createElement("div");
    this.unreadBadge.className = "chat-unread-badge";
    this.unreadBadge.style.display = "none"; // Initially hidden
    this.unreadBadge.style.position = "absolute";
    this.unreadBadge.style.top = "2px";
    this.unreadBadge.style.right = "60px"; // Position to the left of buttons (adjusted for delete button)
    this.unreadBadge.style.zIndex = "10"; // Ensure it's above other elements
    header.appendChild(leftSection);
    header.appendChild(this.unreadBadge);
    // Buttons section
    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "5px";
    buttons.style.flexShrink = "0"; // Prevent buttons from shrinking
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.style.border = "none";
    deleteBtn.style.background = "none";
    deleteBtn.style.color = "white";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.fontSize = "12px";
    deleteBtn.style.padding = "0";
    deleteBtn.style.width = "16px";
    deleteBtn.style.height = "16px";
    deleteBtn.title = "Delete Conversation";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent header click event
      this.deleteConversation();
    });
    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.border = "none";
    closeBtn.style.background = "none";
    closeBtn.style.color = "white";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontSize = "14px";
    closeBtn.style.padding = "0";
    closeBtn.style.width = "16px";
    closeBtn.style.height = "16px";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent header click event
      this.close();
    });
    buttons.appendChild(deleteBtn);
    buttons.appendChild(closeBtn);
    header.appendChild(buttons);
    // Add click event to the entire header to toggle minimize
    header.addEventListener("click", (e) => {
      // Don't toggle if clicking on the buttons
      if (e.target !== deleteBtn && e.target !== closeBtn) {
        this.toggleMinimize();
      }
    });
    // Create body (messages and input)
    const body = document.createElement("div");
    body.style.flex = "1";
    body.style.display = this.minimized ? "none" : "flex";
    body.style.flexDirection = "column";
    body.style.overflow = "hidden";
    // Messages area
    const messagesArea = document.createElement("div");
    messagesArea.className = "chat-messages";
    messagesArea.style.flex = "1";
    messagesArea.style.overflowY = "auto";
    messagesArea.style.padding = "10px";
    messagesArea.style.backgroundColor = "#fff";
    messagesArea.style.fontSize = "12px";
    // Typing indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "typing-indicator";
    typingIndicator.style.fontSize = "11px";
    typingIndicator.style.color = "#999";
    typingIndicator.style.fontStyle = "italic";
    typingIndicator.style.marginBottom = "5px";
    typingIndicator.style.display = "none";
    typingIndicator.textContent = `${this.user.firstname} is typing...`;
    // Input area - simplified without image upload
    const inputArea = document.createElement("div");
    inputArea.style.padding = "8px";
    inputArea.style.borderTop = "1px solid #ddd";
    inputArea.style.backgroundColor = "#f5f5f5";
    inputArea.style.display = "flex";
    inputArea.style.alignItems = "center"; // Center items vertically
    inputArea.style.gap = "8px"; // Add consistent spacing between elements
    const messageInput = document.createElement("input");
    messageInput.type = "text";
    messageInput.placeholder = "Type a message...";
    messageInput.style.flex = "1";
    messageInput.style.padding = "8px";
    messageInput.style.border = "1px solid #ddd";
    messageInput.style.borderRadius = "4px";
    messageInput.style.fontSize = "12px";
    messageInput.style.outline = "none";
    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    sendBtn.style.padding = "8px 12px";
    sendBtn.style.border = "none";
    sendBtn.style.backgroundColor = "#2d5a27"; // Dark green
    sendBtn.style.color = "white";
    sendBtn.style.borderRadius = "4px";
    sendBtn.style.cursor = "pointer";
    sendBtn.style.fontSize = "12px";
    sendBtn.style.fontWeight = "bold";
    sendBtn.style.flexShrink = "0"; // Prevent button from shrinking
    // Typing indicator events
    messageInput.addEventListener("input", () => {
      this.handleTyping();
    });
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendBtn.click();
      }
    });
    sendBtn.addEventListener("click", () => {
      const message = messageInput.value.trim();
      if (message) {
        this.sendMessage(message);
        messageInput.value = "";
        this.stopTyping();
      }
    });
    // Add elements to input area in the correct order
    inputArea.appendChild(messageInput);
    inputArea.appendChild(sendBtn);
    body.appendChild(messagesArea);
    body.appendChild(typingIndicator);
    body.appendChild(inputArea);
    this.container.appendChild(header);
    this.container.appendChild(body);
    document.body.appendChild(this.container);
    console.log("Chat window added to DOM");
    // Store references
    this.chatWindow = {
      container: this.container,
      header: header,
      body: body,
      messagesArea: messagesArea,
      messageInput: messageInput,
      sendBtn: sendBtn,
      typingIndicator: typingIndicator,
    };
    // Track window visibility
    this.setupVisibilityTracking();
    // Add scroll event listener to detect when user scrolls to bottom
    messagesArea.addEventListener("scroll", () => {
      this.handleScroll();
    });
    // Focus the input field when the window is created
    if (!this.minimized) {
      setTimeout(() => {
        messageInput.focus();
      }, 100);
    }
  }
  // Update user avatar - FIXED VERSION
  async updateUserAvatar(user, imageElement, fallbackElement) {
    if (!imageElement || !fallbackElement) {
      console.error("Avatar elements not found");
      return;
    }
    // Check if user has a profile picture
    if (user.hasProfilePicture) {
      try {
        // Get the token for authorization
        const token = localStorage.getItem("auth_token");
        if (!token) {
          console.error("No auth token found");
          this.showFallbackAvatar(user, fallbackElement);
          return;
        }
        // Fetch the profile picture
        const response = await fetch(`/api/auth/profile-picture/${user.id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          // Convert the response to a blob URL
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          // Set the image source and show it
          imageElement.src = imageUrl;
          imageElement.style.display = "block";
          fallbackElement.style.display = "none";
          console.log("Profile picture loaded successfully");
        } else {
          console.error("Failed to load profile picture:", response.status);
          this.showFallbackAvatar(user, fallbackElement);
        }
      } catch (error) {
        console.error("Error loading profile picture:", error);
        this.showFallbackAvatar(user, fallbackElement);
      }
    } else {
      // User doesn't have a profile picture, show fallback
      console.log("User has no profile picture, showing fallback");
      this.showFallbackAvatar(user, fallbackElement);
    }
  }
  // Show fallback avatar with initials
  showFallbackAvatar(user, fallbackElement) {
    const initials = this.getUserInitials(user);
    fallbackElement.textContent = initials;
    fallbackElement.style.display = "flex";
    fallbackElement.style.alignItems = "center";
    fallbackElement.style.justifyContent = "center";
    // Hide the image element
    const imageElement = document.getElementById("userAvatarImage");
    if (imageElement) {
      imageElement.style.display = "none";
    }
  }
  handleScroll() {
    const messagesArea = this.chatWindow.messagesArea;
    const isAtBottom =
      messagesArea.scrollHeight - messagesArea.scrollTop <=
      messagesArea.clientHeight + 5;
    if (isAtBottom && this.isActive && !this.minimized) {
      this.markMessagesAsSeen();
    }
  }
  setupVisibilityTracking() {
    // Check if window is visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.isActive = entry.isIntersecting && !this.minimized;
          if (this.isActive) {
            // Check if user is at the bottom of messages
            this.handleScroll();
          }
          // Update blinking when visibility changes
          this.updateHeaderBlinking();
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(this.container);
  }
  setupSocketListeners() {
    // Listen for typing indicators
    this.socket.on("userTyping", (data) => {
      if (data.userId === this.user.id) {
        this.showTypingIndicator(data.isTyping);
      }
    });
    // Listen for message seen
    this.socket.on("messageSeen", (data) => {
      if (data.seenBy === this.user.id) {
        this.updateMessageStatus(data.messageId, "seen");
      }
    });
  }
  handleTyping() {
    if (!this.isTyping) {
      this.isTyping = true;
      this.socket.emit("typing", {
        senderId: this.userId,
        recipientId: this.user.id,
      });
    }
    // Clear existing timeout
    clearTimeout(this.typingTimeout);
    // Set new timeout
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 1000);
  }
  stopTyping() {
    if (this.isTyping) {
      this.isTyping = false;
      this.socket.emit("stopTyping", {
        senderId: this.userId,
        recipientId: this.user.id,
      });
    }
  }
  showTypingIndicator(isTyping) {
    this.chatWindow.typingIndicator.style.display = isTyping ? "block" : "none";
  }
  toggleMinimize() {
    this.minimized = !this.minimized;
    // Update the container height and body display
    this.container.style.height = this.minimized ? "30px" : "350px";
    this.chatWindow.body.style.display = this.minimized ? "none" : "flex";
    // Update blinking effect when minimized state changes
    this.updateHeaderBlinking();
    // If window is activated, mark messages as seen
    if (!this.minimized && this.isActive) {
      this.handleScroll();
    }
  }
  close() {
    this.container.remove();
    // Notify the chatbox manager that this window is closed
    this.chatboxManager.removeChatWindow(this);
  }
  loadMessages() {
    if (!this.userId) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch(`/api/messages/${this.user.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((messages) => {
        this.messages = messages;
        this.renderMessages();
      })
      .catch((error) => {
        console.error("Error loading messages:", error);
      });
  }
  renderMessages() {
    const messagesArea = this.chatWindow.messagesArea;
    messagesArea.innerHTML = "";
    if (this.messages.length === 0) {
      const noMessages = document.createElement("div");
      noMessages.textContent = "No messages yet. Start a conversation!";
      noMessages.style.textAlign = "center";
      noMessages.style.padding = "20px";
      noMessages.style.color = "#999";
      messagesArea.appendChild(noMessages);
      return;
    }
    this.messages.forEach((message) => {
      const messageEl = this.createMessageElement(message);
      messagesArea.appendChild(messageEl);
    });
    // Scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }
  createMessageElement(message) {
    const messageEl = document.createElement("div");
    messageEl.style.marginBottom = "10px";
    messageEl.dataset.messageId = message._id;
    const isSender = message.senderId === this.userId;
    messageEl.style.textAlign = isSender ? "right" : "left";
    // Create message container with content only (no avatar)
    const messageContainer = document.createElement("div");
    messageContainer.style.display = "flex";
    messageContainer.style.alignItems = "flex-start";
    messageContainer.style.justifyContent = isSender
      ? "flex-end"
      : "flex-start";
    messageContainer.style.marginBottom = "10px";
    // Message content
    const contentContainer = document.createElement("div");
    contentContainer.style.maxWidth = "70%";
    const content = document.createElement("div");
    content.style.display = "inline-block";
    content.style.padding = "8px";
    content.style.borderRadius = "5px";
    content.style.backgroundColor = isSender ? "#e6f2ff" : "#f0f0f0";
    content.style.border = isSender ? "none" : "1px solid #ddd";
    content.textContent = message.content;
    contentContainer.appendChild(content);
    // Add status indicator for sender's messages
    if (isSender) {
      const status = document.createElement("div");
      status.style.fontSize = "10px";
      status.style.color = "#999";
      status.style.marginTop = "2px";
      status.style.textAlign = "right";
      if (message.status === "seen") {
        status.textContent = "Seen";
        status.style.color = "#4caf50";
      } else if (message.status === "delivered") {
        status.textContent = "Delivered";
        status.style.color = "#2d5a27"; // Dark green
      } else {
        status.textContent = "Sent";
        status.style.color = "#999";
      }
      contentContainer.appendChild(status);
    }
    // Add content to message container
    messageContainer.appendChild(contentContainer);
    messageEl.appendChild(messageContainer);
    return messageEl;
  }
  sendMessage(content) {
    if (!this.user || !this.userId) return;
    const message = {
      recipientId: this.user.id,
      content: content,
      type: "text", // Always text now
    };
    // Save via HTTP
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(message),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((savedMessage) => {
        // Add to local messages
        this.messages.push(savedMessage);
        this.renderMessages();
        // Send via Socket.IO
        if (this.socket) {
          this.socket.emit("sendMessage", {
            ...savedMessage,
            senderId: this.userId,
            recipientId: this.user.id,
          });
        }
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  }
  // New method to delete conversation
  deleteConversation() {
    // Show confirmation dialog
    if (
      confirm(
        `Are you sure you want to delete the conversation with ${this.user.firstname}? This action cannot be undone.`
      )
    ) {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      // Show loading indicator
      const originalDeleteBtn =
        this.chatWindow.header.querySelector("button").innerHTML;
      this.chatWindow.header.querySelector("button").innerHTML =
        '<i class="fas fa-spinner fa-spin"></i>';
      fetch(`/api/messages/conversation/${this.user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // Clear local messages
          this.messages = [];
          this.renderMessages();
          // Show success notification
          const successDiv = document.createElement("div");
          successDiv.style.position = "fixed";
          successDiv.style.bottom = "20px";
          successDiv.style.right = "20px";
          successDiv.style.backgroundColor = "#4caf50";
          successDiv.style.color = "white";
          successDiv.style.padding = "10px 15px";
          successDiv.style.borderRadius = "5px";
          successDiv.style.zIndex = "10001";
          successDiv.textContent = "Conversation deleted successfully";
          document.body.appendChild(successDiv);
          // Remove success notification after 3 seconds
          setTimeout(() => {
            document.body.removeChild(successDiv);
          }, 3000);
        })
        .catch((error) => {
          console.error("Error deleting conversation:", error);
          // Show error notification
          const errorDiv = document.createElement("div");
          errorDiv.style.position = "fixed";
          errorDiv.style.bottom = "20px";
          errorDiv.style.right = "20px";
          errorDiv.style.backgroundColor = "#ff4d4d";
          errorDiv.style.color = "white";
          errorDiv.style.padding = "10px 15px";
          errorDiv.style.borderRadius = "5px";
          errorDiv.style.zIndex = "10001";
          errorDiv.textContent =
            "Failed to delete conversation. Please try again.";
          document.body.appendChild(errorDiv);
          // Remove error notification after 3 seconds
          setTimeout(() => {
            document.body.removeChild(errorDiv);
          }, 3000);
        })
        .finally(() => {
          // Restore delete button
          this.chatWindow.header.querySelector("button").innerHTML =
            originalDeleteBtn;
        });
    }
  }
  receiveMessage(message) {
    // Add to messages if it's from the current chat user
    if (message.senderId === this.user.id) {
      this.messages.push(message);
      this.renderMessages();
      // Increment unread count
      this.unreadCount++;
      this.updateUnreadBadge();
      this.updateHeaderBlinking();
      // Update the chatbox manager's unread count
      this.chatboxManager.updateUnreadCount(this.user.id, this.unreadCount);
      // Only mark as delivered, not seen
      if (this.socket) {
        this.socket.emit("messageDelivered", {
          messageId: message._id,
          recipientId: message.recipientId,
        });
      }
      // Show notification if window is not active
      if (!this.isActive || this.minimized) {
        this.playNotificationSound();
      }
    }
  }
  playNotificationSound() {
    // Create audio context for notification sound
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      // iPhone-like tri-tone sound: three beeps at different frequencies
      const frequencies = [941, 1175, 1397]; // D5, D6, F6 notes
      const duration = 0.15; // 150ms per beep
      const gap = 0.1; // 100ms gap between beeps
      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0.2; // Set volume
      // Play each beep in sequence
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine"; // Sine wave for pure tone
        oscillator.frequency.value = freq;
        // Connect oscillator to gain node
        oscillator.connect(gainNode);
        // Calculate start time with delays
        const startTime = audioContext.currentTime + index * (duration + gap);
        // Start and stop the oscillator
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
      console.log("Playing iPhone-style notification sound");
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }
  markMessagesAsSeen() {
    // Only mark messages as seen if the user has scrolled to the bottom
    const messagesArea = this.chatWindow.messagesArea;
    const isAtBottom =
      messagesArea.scrollHeight - messagesArea.scrollTop <=
      messagesArea.clientHeight + 5;
    if (!isAtBottom) return;
    // Mark all unseen messages as seen
    const unseenMessages = this.messages.filter(
      (msg) => msg.senderId === this.user.id && msg.status !== "seen"
    );
    if (unseenMessages.length === 0) return;
    // Update the last seen message ID
    this.lastSeenMessageId = unseenMessages[unseenMessages.length - 1]._id;
    // Reset unread count
    this.unreadCount = 0;
    this.updateUnreadBadge();
    this.updateHeaderBlinking();
    // Update the chatbox manager's unread count
    this.chatboxManager.updateUnreadCount(this.user.id, 0);
    // Update each message status
    unseenMessages.forEach((message) => {
      // Update locally first
      message.status = "seen";
      // Notify server
      if (this.socket) {
        this.socket.emit("markAsSeen", {
          messageId: message._id,
          senderId: message.senderId,
          seenBy: this.userId,
        });
      }
    });
    // Re-render messages to show updated status
    this.renderMessages();
  }
  updateMessageStatus(messageId, status) {
    const message = this.messages.find((m) => m._id === messageId);
    if (message) {
      // Only update if the new status is "higher" than current status
      const statusPriority = { sent: 1, delivered: 2, seen: 3 };
      const currentPriority = statusPriority[message.status] || 0;
      const newPriority = statusPriority[status] || 0;
      if (newPriority > currentPriority) {
        message.status = status;
        this.renderMessages();
      }
    }
  }
  // New methods for blinking functionality
  updateUnreadBadge() {
    if (this.unreadCount > 0) {
      this.unreadBadge.textContent =
        this.unreadCount > 99 ? "99+" : this.unreadCount;
      this.unreadBadge.style.display = "flex";
    } else {
      this.unreadBadge.style.display = "none";
    }
  }
  updateHeaderBlinking() {
    // If there are unread messages and the window is minimized or not active, add blinking class
    if (this.unreadCount > 0 && (this.minimized || !this.isActive)) {
      this.chatWindow.header.classList.add("chat-header-blink");
    } else {
      this.chatWindow.header.classList.remove("chat-header-blink");
    }
  }
}
class ChatSidebar {
  constructor() {
    this.container = null;
    this.minimized = false;
    this.closed = false;
    this.socket = null;
    this.userId = null;
    this.users = [];
    this.chatWindows = [];
    this.unreadCounts = {}; // Track unread counts per user
    this.totalUnread = 0; // Total unread messages
    this.bubble = null; // Reference to the chat bubble
    this.friendsList = null; // Reference to the friends list
    this.isExpanded = false; // Track if bubble is expanded
    this.init();
  }
  init() {
    console.log("Initializing ChatSidebar");
    // Get user info from token
    const token = localStorage.getItem("auth_token");
    if (token) {
      const user = getUserFromToken(token);
      if (user) {
        this.userId = user.userId;
        console.log("User ID from token:", this.userId);
      }
    }
    // Create the chat bubble
    this.createChatBubble();
    // Initialize Socket.IO
    this.initSocket();
    // Load users for chat
    this.loadUsers();
    // Add window resize listener
    window.addEventListener("resize", () => {
      this.repositionChatWindows();
    });
  }
  createChatBubble() {
    console.log("Creating chat bubble DOM elements");
    // Remove existing chat bubble if any
    const existingBubble = document.getElementById("chat-bubble");
    if (existingBubble) {
      existingBubble.remove();
    }

    // Create chat bubble
    this.bubble = document.createElement("div");
    this.bubble.id = "chat-bubble";
    this.bubble.style.position = "fixed";
    this.bubble.style.bottom = "20px";
    this.bubble.style.right = "20px";
    this.bubble.style.width = "40px";
    this.bubble.style.height = "40px";
    this.bubble.style.borderRadius = "50%";
    this.bubble.style.backgroundColor = "#2d5a27"; // Dark green
    this.bubble.style.color = "white";
    this.bubble.style.border = "none";
    this.bubble.style.fontSize = "18px";
    this.bubble.style.cursor = "pointer";
    this.bubble.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    this.bubble.style.zIndex = "9997";
    this.bubble.style.display = "flex";
    this.bubble.style.alignItems = "center";
    this.bubble.style.justifyContent = "center";
    this.bubble.style.transition = "all 0.3s ease";
    this.bubble.innerHTML = "💬"; // Chat bubble emoji

    // Add unread badge to bubble
    this.unreadBadge = document.createElement("div");
    this.unreadBadge.style.position = "absolute";
    this.unreadBadge.style.top = "-5px";
    this.unreadBadge.style.right = "-5px";
    this.unreadBadge.style.backgroundColor = "#ff0000";
    this.unreadBadge.style.color = "white";
    this.unreadBadge.style.borderRadius = "50%";
    this.unreadBadge.style.width = "18px";
    this.unreadBadge.style.height = "18px";
    this.unreadBadge.style.display = "none";
    this.unreadBadge.style.alignItems = "center";
    this.unreadBadge.style.justifyContent = "center";
    this.unreadBadge.style.fontSize = "10px";
    this.unreadBadge.style.fontWeight = "bold";
    this.bubble.appendChild(this.unreadBadge);

    // Add click event to toggle friends list
    this.bubble.addEventListener("click", () => {
      this.toggleFriendsList();
    });

    // Add hover effect
    this.bubble.addEventListener("mouseenter", () => {
      if (!this.isExpanded) {
        this.bubble.style.transform = "scale(1.1)";
      }
    });

    this.bubble.addEventListener("mouseleave", () => {
      if (!this.isExpanded) {
        this.bubble.style.transform = "scale(1)";
      }
    });

    document.body.appendChild(this.bubble);
    console.log("Chat bubble added to DOM");
  }

  createFriendsList() {
    console.log("Creating friends list DOM elements");
    // Remove any existing friends list
    const existingFriendsList = document.getElementById("chat-friends-list");
    if (existingFriendsList) {
      existingFriendsList.remove();
    }

    // Create friends list container
    this.friendsList = document.createElement("div");
    this.friendsList.id = "chat-friends-list";
    this.friendsList.style.position = "fixed";
    this.friendsList.style.bottom = "70px"; // Position above the bubble
    this.friendsList.style.right = "20px";
    this.friendsList.style.width = "250px";
    this.friendsList.style.height = "400px";
    this.friendsList.style.backgroundColor = "#fff";
    this.friendsList.style.border = "1px solid #ccc";
    this.friendsList.style.borderRadius = "5px";
    this.friendsList.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    this.friendsList.style.zIndex = "9998";
    this.friendsList.style.display = "none";
    this.friendsList.style.opacity = "0";
    this.friendsList.style.transform = "translateY(20px)";
    this.friendsList.style.transition = "all 0.3s ease";

    // Create header
    const header = document.createElement("div");
    header.style.backgroundColor = "#2d5a27"; // Dark green
    header.style.color = "white";
    header.style.padding = "10px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.borderRadius = "5px 5px 0 0";

    const title = document.createElement("div");
    title.textContent = "CENRO EMIS Staffs";
    title.style.fontWeight = "bold";
    title.style.fontSize = "14px";
    header.appendChild(title);

    // Create close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.border = "none";
    closeBtn.style.background = "none";
    closeBtn.style.color = "white";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontSize = "16px";
    closeBtn.style.padding = "0";
    closeBtn.style.width = "20px";
    closeBtn.style.height = "20px";
    closeBtn.addEventListener("click", () => {
      this.toggleFriendsList();
    });
    header.appendChild(closeBtn);

    // Create body (user list)
    const body = document.createElement("div");
    body.style.flex = "1";
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.overflow = "hidden";

    // Search bar
    const searchBar = document.createElement("div");
    searchBar.style.padding = "8px";
    searchBar.style.borderBottom = "1px solid #eee";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search CENRO EMIS Staffs...";
    searchInput.style.width = "100%";
    searchInput.style.padding = "8px";
    searchInput.style.border = "1px solid #ddd";
    searchInput.style.borderRadius = "4px";
    searchInput.style.fontSize = "12px";
    searchInput.addEventListener("input", (e) => {
      this.filterUsers(e.target.value);
    });
    searchBar.appendChild(searchInput);

    // User list area
    const userListArea = document.createElement("div");
    userListArea.id = "chat-user-list";
    userListArea.style.flex = "1";
    userListArea.style.overflowY = "auto";
    userListArea.style.padding = "5px";
    userListArea.style.backgroundColor = "#f5f5f5";

    body.appendChild(searchBar);
    body.appendChild(userListArea);

    this.friendsList.appendChild(header);
    this.friendsList.appendChild(body);
    document.body.appendChild(this.friendsList);

    // Store references
    this.chatSidebar = {
      container: this.friendsList,
      header: header,
      body: body,
      userListArea: userListArea,
      searchInput: searchInput,
    };

    // Render user list
    this.renderUserList();
  }

  toggleFriendsList() {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      // Create friends list if it doesn't exist
      if (!this.friendsList) {
        this.createFriendsList();
      }

      // Show friends list with animation
      this.friendsList.style.display = "flex";
      this.friendsList.style.flexDirection = "column";

      // Animate bubble and friends list
      this.bubble.style.transform = "scale(1.1)";
      this.bubble.style.boxShadow = "0 4px 15px rgba(0,0,0,0.4)";

      setTimeout(() => {
        this.friendsList.style.opacity = "1";
        this.friendsList.style.transform = "translateY(0)";
      }, 10);
    } else {
      // Hide friends list with animation
      this.friendsList.style.opacity = "0";
      this.friendsList.style.transform = "translateY(20px)";

      // Reset bubble style
      this.bubble.style.transform = "scale(1)";
      this.bubble.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";

      setTimeout(() => {
        this.friendsList.style.display = "none";
      }, 300);
    }

    // Reposition chat windows after toggling friends list
    setTimeout(() => {
      this.repositionChatWindows();
    }, 350);
  }

  updateUnreadBadge() {
    if (this.totalUnread > 0) {
      this.unreadBadge.textContent =
        this.totalUnread > 99 ? "99+" : this.totalUnread;
      this.unreadBadge.style.display = "flex";
    } else {
      this.unreadBadge.style.display = "none";
    }
  }

  updateUnreadCount(userId, count) {
    // Update the unread count for this user
    this.unreadCounts[userId] = count;
    // Calculate total unread messages
    this.totalUnread = Object.values(this.unreadCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    // Update the badge
    this.updateUnreadBadge();
    // Update the user list to show badges
    if (this.isExpanded && this.friendsList) {
      this.renderUserList();
    }
    // Update blinking for all chat windows
    this.updateAllWindowsBlinking();
  }

  updateAllWindowsBlinking() {
    // Update blinking effect for all chat windows
    this.chatWindows.forEach((window) => {
      window.updateHeaderBlinking();
    });
  }

  loadUsers() {
    if (!this.userId) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    console.log("Loading users...");
    fetch("/api/auth/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((users) => {
        console.log("Users loaded:", users);
        // Filter out the current user
        this.users = users.filter((user) => user.id !== this.userId);
        if (this.isExpanded && this.friendsList) {
          this.renderUserList();
        }
      })
      .catch((error) => {
        console.error("Error loading users:", error);
      });
  }

  filterUsers(searchTerm) {
    if (!this.isExpanded || !this.friendsList) return;
    const userListArea = this.chatSidebar.userListArea;
    const userItems = userListArea.querySelectorAll(".user-item");
    userItems.forEach((item) => {
      const userName = item
        .querySelector(".user-name")
        .textContent.toLowerCase();
      const userEmail = item
        .querySelector(".user-email")
        .textContent.toLowerCase();
      if (
        userName.includes(searchTerm.toLowerCase()) ||
        userEmail.includes(searchTerm.toLowerCase())
      ) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  }

  renderUserList() {
    if (!this.isExpanded || !this.friendsList) return;
    console.log("Rendering user list");
    const userListArea = this.chatSidebar.userListArea;
    userListArea.innerHTML = "";
    if (this.users.length === 0) {
      const noUsers = document.createElement("div");
      noUsers.textContent = "No CENRO Staffs online";
      noUsers.style.textAlign = "center";
      noUsers.style.padding = "20px";
      noUsers.style.color = "#999";
      noUsers.style.fontSize = "12px";
      userListArea.appendChild(noUsers);
      return;
    }
    this.users.forEach((user) => {
      const userEl = document.createElement("div");
      userEl.className = "user-item";
      userEl.style.display = "flex";
      userEl.style.alignItems = "center";
      userEl.style.padding = "8px";
      userEl.style.borderRadius = "3px";
      userEl.style.cursor = "pointer";
      userEl.style.marginBottom = "2px";
      userEl.style.position = "relative"; // For badge positioning
      // Hover effect
      userEl.addEventListener("mouseenter", () => {
        userEl.style.backgroundColor = "#e6e6e6";
      });
      userEl.addEventListener("mouseleave", () => {
        userEl.style.backgroundColor = "transparent";
      });
      // User avatar
      const avatarContainer = document.createElement("div");
      avatarContainer.style.position = "relative";
      avatarContainer.style.width = "32px";
      avatarContainer.style.height = "32px";
      avatarContainer.style.marginRight = "10px";
      avatarContainer.style.flexShrink = "0";
      // Create image element
      const avatarImage = document.createElement("img");
      avatarImage.style.width = "100%";
      avatarImage.style.height = "100%";
      avatarImage.style.borderRadius = "50%";
      avatarImage.style.objectFit = "cover";
      avatarImage.style.display = "none";
      // Create fallback element
      const avatarFallback = document.createElement("div");
      avatarFallback.style.position = "absolute";
      avatarFallback.style.top = "0";
      avatarFallback.style.left = "0";
      avatarFallback.style.width = "100%";
      avatarFallback.style.height = "100%";
      avatarFallback.style.borderRadius = "50%";
      avatarFallback.style.backgroundColor = "#2d5a27"; // Dark green
      avatarFallback.style.color = "white";
      avatarFallback.style.display = "flex";
      avatarFallback.style.alignItems = "center";
      avatarFallback.style.justifyContent = "center";
      avatarFallback.style.fontSize = "12px";
      avatarFallback.style.fontWeight = "bold";
      avatarContainer.appendChild(avatarImage);
      avatarContainer.appendChild(avatarFallback);
      // Load user avatar
      this.loadUserAvatar(user, avatarImage, avatarFallback);
      // Online indicator
      if (user.isOnline) {
        const onlineIndicator = document.createElement("div");
        onlineIndicator.style.position = "absolute";
        onlineIndicator.style.width = "10px";
        onlineIndicator.style.height = "10px";
        onlineIndicator.style.borderRadius = "50%";
        onlineIndicator.style.backgroundColor = "#4caf50";
        onlineIndicator.style.border = "2px solid white";
        onlineIndicator.style.bottom = "0";
        onlineIndicator.style.right = "0";
        avatarContainer.appendChild(onlineIndicator);
      }
      // User info
      const userInfo = document.createElement("div");
      userInfo.style.flex = "1";
      const userName = document.createElement("div");
      userName.className = "user-name";
      userName.textContent = `${user.firstname} ${user.lastname}`;
      userName.style.fontWeight = "bold";
      userName.style.fontSize = "12px";
      userName.style.whiteSpace = "nowrap";
      userName.style.overflow = "hidden";
      userName.style.textOverflow = "ellipsis";
      const userEmail = document.createElement("div");
      userEmail.className = "user-email";
      userEmail.textContent = user.email;
      userEmail.style.fontSize = "10px";
      userEmail.style.color = "#999";
      const userStatus = document.createElement("div");
      userStatus.textContent = user.isOnline ? "Active now" : "Offline";
      userStatus.style.fontSize = "10px";
      userStatus.style.color = user.isOnline ? "#4caf50" : "#999";
      userInfo.appendChild(userName);
      userInfo.appendChild(userEmail);
      userInfo.appendChild(userStatus);
      userEl.appendChild(avatarContainer);
      userEl.appendChild(userInfo);
      // Add unread badge if there are unread messages
      const unreadCount = this.unreadCounts[user.id] || 0;
      if (unreadCount > 0) {
        const badge = document.createElement("div");
        badge.style.position = "absolute";
        badge.style.top = "5px";
        badge.style.right = "5px";
        badge.style.backgroundColor = "#ff0000";
        badge.style.color = "white";
        badge.style.borderRadius = "50%";
        badge.style.width = "18px";
        badge.style.height = "18px";
        badge.style.display = "flex";
        badge.style.alignItems = "center";
        badge.style.justifyContent = "center";
        badge.style.fontSize = "10px";
        badge.style.fontWeight = "bold";
        badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
        userEl.appendChild(badge);
      }
      // Click to open chat
      userEl.addEventListener("click", () => {
        console.log("User clicked:", user);
        this.openChatWithUser(user);
      });
      userListArea.appendChild(userEl);
    });
  }

  // Helper function to load user avatar
  async loadUserAvatar(user, imgElement, fallbackElement) {
    if (!imgElement || !fallbackElement) {
      console.error("Avatar elements not found");
      return;
    }
    console.log("Loading avatar for user:", user);
    // Check if user has a profile picture
    if (user.hasProfilePicture) {
      console.log("User has profile picture, fetching...");
      try {
        // Get the token for authorization
        const token = localStorage.getItem("auth_token");
        if (!token) {
          console.error("No auth token found");
          this.showFallbackAvatar(user, fallbackElement);
          return;
        }
        // Show loading state
        imgElement.style.display = "none";
        fallbackElement.style.display = "flex";
        fallbackElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        // Fetch the profile picture
        const response = await fetch(`/api/auth/profile-picture/${user.id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("Profile picture response status:", response.status);
        if (response.ok) {
          // Convert the response to a blob URL
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          console.log("Profile picture loaded, blob URL:", imageUrl);
          // Set the image source and show it
          imgElement.src = imageUrl;
          imgElement.style.display = "block";
          fallbackElement.style.display = "none";
          console.log("Profile picture displayed successfully");
        } else {
          console.error(
            "Failed to load profile picture:",
            response.status,
            response.statusText
          );
          this.showFallbackAvatar(user, fallbackElement);
        }
      } catch (error) {
        console.error("Error loading profile picture:", error);
        this.showFallbackAvatar(user, fallbackElement);
      }
    } else {
      // User doesn't have a profile picture, show fallback
      console.log("User has no profile picture, showing fallback");
      this.showFallbackAvatar(user, fallbackElement);
    }
  }

  // Helper method to show fallback avatar
  showFallbackAvatar(user, fallbackElement) {
    const initials = this.getUserInitials(user);
    fallbackElement.textContent = initials;
    fallbackElement.style.display = "flex";
    fallbackElement.style.alignItems = "center";
    fallbackElement.style.justifyContent = "center";
    // Hide the image element
    if (fallbackElement.previousElementSibling) {
      fallbackElement.previousElementSibling.style.display = "none";
    }
  }

  // Helper function to get user initials
  getUserInitials(user) {
    if (user.firstname && user.lastname) {
      return `${user.firstname.charAt(0)}${user.lastname.charAt(
        0
      )}`.toUpperCase();
    } else if (user.firstname) {
      return user.firstname.charAt(0).toUpperCase();
    } else if (user.lastname) {
      return user.lastname.charAt(0).toUpperCase();
    } else {
      return user.email.charAt(0).toUpperCase();
    }
  }

  openChatWithUser(user) {
    console.log("Opening chat with user:", user);
    // Close the friends list when opening a chat
    if (this.isExpanded) {
      this.toggleFriendsList();
    }
    // Check if a chat window for this user already exists
    const existingWindow = this.chatWindows.find(
      (window) => window.user.id === user.id
    );
    if (existingWindow) {
      console.log("Chat window already exists, bringing to front");
      // Bring the existing window to focus
      existingWindow.container.style.zIndex = "10000";
      // Reset unread count when opening chat
      this.updateUnreadCount(user.id, 0);
      return;
    }
    console.log("Creating new chat window");
    try {
      // Create a new chat window with index
      const chatWindow = new ChatWindow(user, this, this.chatWindows.length);
      this.chatWindows.push(chatWindow);
      console.log("Chat window created and added to chatWindows array");
      // Reset unread count when opening chat
      this.updateUnreadCount(user.id, 0);
      // Reposition all chat windows with proper spacing
      this.repositionChatWindows();
    } catch (error) {
      console.error("Error creating chat window:", error);
    }
  }

  removeChatWindow(chatWindow) {
    // Remove the chat window from the array
    const index = this.chatWindows.indexOf(chatWindow);
    if (index > -1) {
      this.chatWindows.splice(index, 1);
    }
    // Reposition remaining chat windows
    this.repositionChatWindows();
  }

  repositionChatWindows() {
    const windowWidth = 250; // Width of each chat window
    const windowSpacing = 10; // 10px spacing between windows
    const bubbleRight = 20; // Right margin of the chat bubble
    const bubbleWidth = 40; // Width of the chat bubble
    const friendsListWidth = 250; // Width of the friends list
    const friendsListRight = 20; // Right margin of the friends list

    // Calculate the reference point based on whether friends list is open
    let referenceRight;
    if (this.isExpanded) {
      // Friends list is open - position chat windows to the left of friends list
      referenceRight = friendsListRight + friendsListWidth;
    } else {
      // Friends list is closed - position chat windows to the left of chat bubble
      referenceRight = bubbleRight + bubbleWidth;
    }

    // Position chat windows from right to left
    this.chatWindows.forEach((window, index) => {
      // Calculate the right offset with proper spacing
      const rightOffset =
        referenceRight + windowSpacing + index * (windowWidth + windowSpacing);
      // Set the position
      window.container.style.right = `${rightOffset}px`;
      window.index = index; // Update the index
    });
  }

  setupNotificationListener() {
    // Listen for new messages
    this.socket.on("newMessage", (data) => {
      // Find the chat window for the sender
      const chatWindow = this.chatWindows.find(
        (window) => window.user.id === data.senderId
      );
      if (chatWindow) {
        chatWindow.receiveMessage(data);
      } else {
        // Update unread count
        const user = this.users.find((u) => u.id === data.senderId);
        if (user) {
          const currentCount = this.unreadCounts[user.id] || 0;
          this.updateUnreadCount(user.id, currentCount + 1);
        }
      }
    });
  }

  initSocket() {
    // Initialize Socket.IO client
    this.socket = io();
    // Connect event
    this.socket.on("connect", () => {
      console.log("Connected to server");
      if (this.userId) {
        this.socket.emit("joinRoom", this.userId);
      }
    });
    // Setup notification listener
    this.setupNotificationListener();
    // Listen for message delivered
    this.socket.on("messageDelivered", (data) => {
      // Find the chat window for the recipient
      const chatWindow = this.chatWindows.find(
        (window) => window.user.id === data.recipientId
      );
      if (chatWindow) {
        chatWindow.updateMessageStatus(data.messageId, "delivered");
      }
    });
    // Listen for message seen
    this.socket.on("messageSeen", (data) => {
      // Find the chat window for the recipient
      const chatWindow = this.chatWindows.find(
        (window) => window.user.id === data.seenBy
      );
      if (chatWindow) {
        chatWindow.updateMessageStatus(data.messageId, "seen");
      }
    });
  }
}
// Initialize the chat sidebar when the page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing chat sidebar");
  window.chatSidebar = new ChatSidebar();
});
// Add CSS for notification animations and blinking effect
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  /* Chat tab blinking effect */
  .chat-header-blink {
    animation: blinkTab 1.5s infinite;
  }
  @keyframes blinkTab {
    0% { background-color: #2d5a27; } /* Dark green */
    50% { background-color: #4a7c59; } /* Medium green */
    100% { background-color: #2d5a27; } /* Dark green */
  }
  
  /* Unread count badge */
  .chat-unread-badge {
    background-color: #ff0000;
    color: white;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: "bold";
    flex-shrink: 0; /* Prevent badge from shrinking */
    box-shadow: 0 1px 2px rgba(0,0,0,0.2); /* Add shadow for better visibility */
  }
  
  /* Chat bubble hover effect */
  #chat-bubble:hover:not(.expanded) {
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }
  
  /* Friends list animation */
  #chat-friends-list {
    transition: all 0.3s ease;
  }
`;
document.head.appendChild(style);

# Chat Command System

The enhanced chat system now includes a powerful command processor that allows users to control chat behavior, manage messages, and save/load sessions to/from IPFS.

## 🎯 **Command Overview**

Commands start with `/` and provide advanced chat functionality beyond regular conversation.

### **Message Flow**
```
User Input → Command Check → Execute Command OR Process with AI
```

- **Commands** (start with `/`) → Execute special functions
- **Regular text** → Process with AI engine as usual

## 📋 **Available Commands**

### **Message Management**

#### `/fill <pesan>`
Replace the last user message with new content.
```
/fill Halo, saya ingin register IP gambar ini
```
- Replaces your last message and processes it with AI
- Useful for correcting typos or changing requests

#### `/lagi`
Resend the previous user message.
```
/lagi
```
- Repeats your last message
- Useful if AI didn't respond or you want to try again

#### `/edit <id> <pesan baru>`
Edit a specific message by its ID.
```
/edit abc123 Pesan yang sudah diperbaiki
```
- Use the first few characters of message ID
- Only user messages can be edited

#### `/clear`
Clear entire chat history.
```
/clear
```
- Removes all messages from current session
- Cannot be undone

### **IPFS Integration**

#### `/save`
Save current chat session to IPFS via Pinata.
```
/save
```
- Uploads entire chat history to IPFS
- Returns a CID (Content Identifier) for sharing
- Chat can be loaded later using the CID

#### `/load <cid>`
Load a chat session from IPFS.
```
/load QmABC123def456
```
- Loads chat history from IPFS using CID
- Replaces current session
- Works with any valid IPFS CID

### **Help**

#### `/help`
Show list of available commands.
```
/help
```
- Displays all commands with examples
- Quick reference for command syntax

## 🔧 **Technical Details**

### **Message Structure**
Each message is stored with metadata:
```json
{
  "id": "uuid",
  "role": "user|assistant|system",
  "content": "message text",
  "timestamp": "2025-09-01T06:00:00Z",
  "buttons": ["array", "of", "buttons"],
  "image": {"url": "...", "alt": "..."},
  "links": [{"text": "...", "url": "..."}]
}
```

### **Session Management**
- **Auto-save**: Sessions saved to localStorage every 30 seconds
- **Message limit**: 20 messages per session (auto-archive older ones)
- **Memory management**: Old sessions archived automatically
- **Persistence**: Full session history maintained

### **IPFS Integration**
- **Pinata SDK**: Uses Pinata for reliable IPFS uploads
- **Gateway fallback**: Multiple IPFS gateways for loading
- **Validation**: Strict validation of loaded session data
- **Sharing**: Generate shareable URLs for chat sessions

## 🎮 **Usage Examples**

### **Basic Workflow**
```
User: Register IP untuk gambar ini
Bot: [Analysis response with buttons]

User: /fill Register IP dengan lisensi commercial
Bot: [Updated analysis for commercial license]
```

### **Session Management**
```
User: /save
Bot: 💾 Chat berhasil disimpan ke IPFS
     CID: QmABC123def456
     Gunakan /load QmABC123def456 untuk memuat kembali

[Later...]
User: /load QmABC123def456
Bot: 📥 Chat berhasil dimuat dari IPFS (15 pesan)
```

### **Message Editing**
```
User: Regiter IP
Bot: [Response]

User: /edit abc123 Register IP
Bot: ✅ Pesan abc123 berhasil diedit
```

## 🚀 **Advanced Features**

### **Auto-Loading from URL**
Share chat sessions via URL parameters:
```
https://yourapp.com/?load=QmABC123def456
```
- Automatically loads session when page opens
- Perfect for sharing chat histories
- CID validation ensures security

### **Session Statistics**
Access session information programmatically:
```javascript
const stats = chatAgent.getSessionStats();
// Returns: { currentMessages, archivedSessions, totalArchivedMessages }
```

### **Message Search**
Search across current and archived sessions:
```javascript
const results = chatAgent.searchMessages("register IP", true);
// Searches current session and archived sessions
```

### **Batch Operations**
- **Auto-archiving**: Old messages automatically archived
- **Session merging**: Load sessions without losing current chat
- **Bulk export**: Export all session data for backup

## 🔒 **Security & Privacy**

### **IPFS Considerations**
- **Public storage**: IPFS is public, don't save sensitive data
- **Immutable**: Once uploaded, content cannot be changed
- **Persistent**: Content remains available as long as pinned

### **Data Validation**
- **Input sanitization**: All commands validated before execution
- **Session validation**: Loaded sessions checked for integrity
- **CID validation**: Only valid IPFS CIDs accepted

### **Local Storage**
- **Auto-cleanup**: Old sessions automatically removed
- **Size limits**: Respects browser storage limitations
- **Error handling**: Graceful fallback if storage fails

## 🎯 **Best Practices**

### **Command Usage**
- Use `/help` to learn commands
- Use `/save` regularly to backup important chats
- Use `/fill` for quick corrections instead of retyping
- Use `/clear` when starting new topics

### **Session Management**
- Save important conversations before clearing
- Use descriptive content for easy identification
- Share CIDs responsibly (public storage)
- Load sessions in new tabs to keep current chat

### **Error Recovery**
- Commands provide clear error messages
- `/help` always available for reference
- Session auto-save prevents data loss
- Multiple IPFS gateways ensure availability

## 🔄 **Integration with Smart Analysis**

Commands work seamlessly with smart analysis:
- **File uploads** → Auto smart analysis
- **Command responses** → Continue with AI processing
- **Session loading** → Preserve analysis context
- **Message editing** → Re-trigger analysis if needed

The command system enhances the chat experience without interfering with the core AI functionality. Users can choose to use commands or stick with regular chat interaction.

---

*Type `/help` in the chat to see all available commands with examples.*

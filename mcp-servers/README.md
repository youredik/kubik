# MCP Servers for Kilo Code

This directory contains custom MCP (Model Context Protocol) servers that extend the capabilities of Kilo Code for web development.

## Available Servers

### 1. Filesystem Server (`filesystem-server.js`)
Provides secure file system operations within allowed directories.

**Tools:**
- `read_file` - Read file contents
- `list_dir` - List directory contents
- `write_file` - Write content to files
- `create_dir` - Create directories
- `delete_file` - Delete files

**Usage:**
```bash
node filesystem-server.js /path/to/allowed/directory
```

### 2. Terminal Server (`terminal-server.js`)
Allows execution of safe terminal commands.

**Tools:**
- `run_command` - Execute terminal commands

**Environment Variables:**
- `ALLOWED_COMMANDS` - Comma-separated list of allowed commands

**Usage:**
```bash
node terminal-server.js
```

### 3. Web Reader Server (`web-reader-server.js`)
Fetches and extracts content from web pages.

**Tools:**
- `fetch_webpage` - Extract content from web pages
- `search_web` - Search the web using DuckDuckGo

**Environment Variables:**
- `ALLOWED_DOMAINS` - Comma-separated list of allowed domains

**Usage:**
```bash
node web-reader-server.js
```

### 4. Browser Automation Server (`browser-server.js`)
Provides browser automation capabilities using Playwright.

**Tools:**
- `navigate` - Navigate to URLs
- `screenshot` - Take screenshots
- `click` - Click elements
- `type_text` - Type text into inputs
- `get_text` - Extract text from elements
- `get_html` - Extract HTML content
- `wait_for_selector` - Wait for elements

**Usage:**
```bash
node browser-server.js
```

## Installation

```bash
cd mcp-servers
npm install
```

## Configuration

MCP servers are configured in the root `.kilorc.json` file:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/path/to/filesystem-server.js", "/allowed/directory"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Security

- **Filesystem Server**: Restricted to specified directories only
- **Terminal Server**: Limited to whitelisted commands
- **Web Reader Server**: Restricted to allowed domains
- **Browser Server**: Runs in headless mode with security restrictions

## Development

To add a new MCP server:

1. Create a new `.js` file in this directory
2. Implement the MCP Server interface
3. Add configuration to `.kilorc.json`
4. Update this README

## Testing

Test individual servers:

```bash
# Test filesystem server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node filesystem-server.js /tmp

# Test terminal server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node terminal-server.js
```

## Integration with Kilo Code

These servers automatically integrate with Kilo Code through the `.kilorc.json` configuration file, providing additional tools for:

- File system operations
- Terminal command execution
- Web content extraction
- Browser automation
- Code analysis and generation

## Troubleshooting

**Common Issues:**

1. **Permission Denied**: Ensure proper file permissions and directory access
2. **Command Not Found**: Check that Node.js is properly installed and in PATH
3. **Connection Failed**: Verify MCP server configuration in `.kilorc.json`
4. **Browser Issues**: Ensure Playwright browsers are installed for browser server

**Logs:**
Each server outputs debug information to stderr. Check the Kilo Code logs for MCP server errors.
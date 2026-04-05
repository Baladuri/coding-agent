# Coding Agent

A globally installable CLI agent that understands your codebase and acts on your behalf through natural language. Built with Mastra, Claude AI, and the Model Context Protocol (MCP).

## Features

- **Automatic Project Detection** — Detects the project you're in or accepts a path argument
- **Codebase Understanding** — Reads and analyzes project structure, dependencies, and configuration
- **GitHub Integration** — Auto-detects repository info from `.git/config` and connects via GitHub MCP server
- **Persistent Memory** — Remembers conversations across sessions with a centralized SQLite store in `~/.coding-agent/memory.db` and a conservative 5-message history
- **Natural Language Interaction** — Ask questions and get answers about your code in plain English
- **GitHub Operations** — Read commits, branches, issues, PRs; create new issues
- **Global CLI** — Install once, run from any directory
- **Interactive REPL** — Multi-turn conversations with commands (`help`, `clear`, `exit`)

## Prerequisites

- **Node.js**: v20 
- **npm**: v10 or later
- **API Keys**:
  - `ANTHROPIC_API_KEY` — Get from [Anthropic](https://console.anthropic.com)
  - `GITHUB_TOKEN` — Generate from [GitHub Settings](https://github.com/settings/tokens) (personal access token with repo access)

## Installation

### From Source

```bash
git clone https://github.com/Baladuri/coding-agent.git
cd coding-agent
npm install
npm run build
npm install -g .
```

### Verify Installation

```bash
coding-agent --version
```

## Configuration

The agent stores API keys in `~/.coding-agent/config.json` for easy global access.

### First Run Setup

On your first run, the agent will prompt you for required API keys:

```bash
coding-agent
⚙️  First time setup — API keys required

📝 Enter your ANTHROPIC_API_KEY: sk-ant-...
📝 Enter your GITHUB_TOKEN: ghp_...

✅ Config saved to /Users/username/.coding-agent/config.json
```

Your keys are saved locally and loaded automatically on every run.

### Configuration Priority

The agent loads credentials in this order (first match wins):

1. **Environment Variables** — `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` (useful for CI/CD)
2. **Home Directory Config** — `~/.coding-agent/config.json`
3. **First Run Prompt** — Creates config if both are missing

### Manual Configuration

If you prefer to set up manually or update keys:

**Via environment variables:**

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export GITHUB_TOKEN="ghp_..."
coding-agent
```

**Via config file:**

Create or edit `~/.coding-agent/config.json`:

```json
{
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "GITHUB_TOKEN": "ghp_..."
}
```

Then run:

```bash
coding-agent
```

### Getting API Keys

- **ANTHROPIC_API_KEY** — Get from [Anthropic Console](https://console.anthropic.com/keys)
- **GITHUB_TOKEN** — Generate from [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens) with `repo` scope

## Usage

### Basic Usage

Run from inside any project directory:

```bash
coding-agent
```

Or point to a specific project:

```bash
coding-agent /path/to/your/project
```

### Interactive Commands

Once running, type one of the following:

- `help` — Display available commands
- `clear` — Clear the terminal screen
- `exit` or `quit` — Exit the agent

Or type any question to chat with the agent.

### File Reading Behavior

The agent is configured to be extremely conservative when scanning your repository:

- It will only read 2–3 files per response
- It lists the top-level directory first and does not read file contents unless requested
- It avoids reading `node_modules`, `dist`, `build`, `.git`, `vendor`, `coverage`, and `__pycache__`
- It reads files one at a time, smallest/most relevant first
- Large files are only read partially unless more detail is explicitly requested

### Example Interactions

**Understand the project:**
```
coding-agent> What is this project about?

🤖 Agent: Based on the project structure and configuration I can see, this is a TypeScript-based Node.js application...
```

**Check repository status:**
```
coding-agent> Show me recent commits

🤖 Agent: I'll check the recent commits in your repository...
```

**Query GitHub:**
```
coding-agent> What open issues exist?

🤖 Agent: Let me check your GitHub repository for open issues...
```

**Create an issue:**
```
coding-agent> Create a GitHub issue titled "Add support for X"

🤖 Agent: I'll create that issue for you...
```

**Check branches:**
```
coding-agent> What branches exist in this repo?

🤖 Agent: Let me list the available branches...
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────┐
│          coding-agent CLI Entry Point            │
├─────────────────────────────────────────────────┤
│  1. Detect project path (CLI arg or cwd)        │
│  2. Extract GitHub info from .git/config        │
│  3. Create project-specific thread ID           │
│  4. Load project context (structure, files)     │
│  5. Initialize Mastra agent with memory         │
│  6. Start interactive REPL                      │
└─────────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────┐
    │   Mastra Agent Framework        │
    ├────────────────────────────────┤
    │ - Claude Haiku 4.5              │
    │ - MCP Client (Filesystem, Git)  │
    │ - Persistent Memory (LibSQL)    │
    │ - Tool Execution                │
    └────────────────────────────────┘
         ↓
    ┌────────────────────────────────┐
    │   Available Tools via MCP       │
    ├────────────────────────────────┤
    │ - Filesystem: read/write        │
    │ - GitHub: repos, issues, PRs    │
    └────────────────────────────────┘
         ↓
    ┌────────────────────────────────┐
    │   External Services             │
    ├────────────────────────────────┤
    │ - Anthropic API (Claude)        │
    │ - GitHub API                    │
    └────────────────────────────────┘
```

### Memory System

- **Centralized Storage** — Conversation memory is stored in `~/.coding-agent/memory.db`
- **Sliding Window** — Last 5 messages are kept in context to manage token limits
- **Semantic Recall** — Disabled by default to avoid excessive context load
- **SQLite Backend** — `memory.db` stores all conversation history across runs

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js v20+ |
| **Language** | TypeScript 6.0+ |
| **Agent Framework** | Mastra (@mastra/core, @mastra/mcp) |
| **AI Model** | Anthropic Claude Haiku 4.5 |
| **MCP Servers** | @modelcontextprotocol/server-filesystem, github-mcp-server |
| **Memory** | @mastra/memory with LibSQL (@mastra/libsql) |
| **CLI Framework** | Node.js readline (REPL) |
| **Build** | TypeScript Compiler (tsc) |

## Project Structure

```
coding-agent/
├── src/
│   ├── agent.ts       # Mastra agent setup with Claude + MCP tools
│   ├── mcp.ts         # MCP client factory (filesystem + GitHub)
│   └── index.ts       # Main CLI entry, REPL, project detection
├── dist/              # Compiled JavaScript (built by tsc)
├── memory.db          # SQLite persistent memory (created on first run)
├── package.json       # npm configuration with bin entry
├── tsconfig.json      # TypeScript compiler config
└── README.md          # This file
```

## Configuration

### tsconfig.json

- **Target**: ES2022
- **Module**: CommonJS
- **Strict Mode**: Enabled
- **Output**: `./dist` with declaration files
- **Platform**: Node.js > 20

### package.json

- **bin**: `{"coding-agent": "./dist/index.js"}`
- **scripts**: `build` (tsc), `prepare` (auto-build on install), `dev` (tsx in dev mode)
- **Engine**: Node.js >=20

## Development

### Building from Source

```bash
npm run build
```

Output: TypeScript files compiled to `dist/`

### Development Mode (with auto-reload)

```bash
npm run dev
```

Runs directly with tsx without building.

### Testing Locally

After building:

```bash
node dist/index.js /path/to/test/project
```

## Troubleshooting

### Issue: "ANTHROPIC_API_KEY not found"

**Solution**: Ensure your API keys are stored in `~/.coding-agent/config.json` or exported as environment variables:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export GITHUB_TOKEN="ghp_..."
```

If you prefer config file mode, create or update `~/.coding-agent/config.json`:

```json
{
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "GITHUB_TOKEN": "ghp_..."
}
```

### Issue: "GitHub token not authorized"

**Solution**: Verify your GitHub token has `repo` scope:
1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Create a new token with `repo` scope
3. Update `~/.coding-agent/config.json` or set `GITHUB_TOKEN` as an environment variable

### Issue: "MCP servers not found" when installed globally

**Solution**: Reinstall globally to ensure MCP server packages are available:
```bash
npm install -g .
```

### Issue: Memory not persisting

**Solution**: Ensure write permissions in your home directory so `~/.coding-agent/memory.db` can be written.

## License

ISC

## Contributing

Contributions welcome. Fork the repo, create a feature branch, and submit a pull request.

## Support

For issues, questions, or suggestions, open an [issue on GitHub](https://github.com/Baladuri/coding-agent/issues).
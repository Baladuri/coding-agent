# Coding Agent

A TypeScript-based AI coding agent built with Mastra framework and Anthropic Claude.

## Features

- **AI-Powered Code Analysis**: Uses Claude Opus 4 for intelligent code understanding
- **Project Structure Analysis**: Automatically analyzes project files and dependencies
- **MCP Integration**: Configured for Model Context Protocol servers (filesystem and GitHub)
- **TypeScript Support**: Full TypeScript implementation with strict typing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
GITHUB_TOKEN=your_github_personal_access_token
```

3. Run the agent:
```bash
npm run dev
```

## Architecture

- **src/mcp.ts**: MCP client configuration for filesystem and GitHub servers
- **src/agent.ts**: Mastra agent setup with Claude model and MCP tools
- **src/index.ts**: Main entry point that analyzes the project and runs the agent

## MCP Integration Notes

The project is configured to use MCP servers for enhanced tool access:

- **Filesystem Server**: Provides file reading/writing capabilities
- **GitHub Server**: Enables repository operations and code search

**Current Limitation**: Due to Claude's 200k token context limit, the full MCP tool suite exceeds the maximum prompt size. The current implementation uses direct file system access as a workaround. Future improvements could include:

- Tool selection/filtering to reduce token usage
- Streaming tool access
- Model with larger context windows

## Technologies Used

- **Mastra**: Agent framework and MCP client
- **Anthropic Claude**: AI model for code analysis
- **TypeScript**: Type-safe development
- **MCP Servers**: Standardized tool integration
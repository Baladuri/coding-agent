#!/usr/bin/env node
import 'dotenv/config';
import { createAgent } from './agent';
import { createMCPClient } from './mcp';
import { join, basename, resolve } from 'path';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';

function getGitHubRepoInfo(projectPath: string): string | null {
  try {
    const gitConfigPath = join(projectPath, '.git', 'config');
    const gitConfig = readFileSync(gitConfigPath, 'utf-8');

    // Look for remote URLs in the config
    const remoteUrlRegex = /\[remote\s+"[^"]+"\]\s*url\s*=\s*(.+)/gi;
    let match;
    while ((match = remoteUrlRegex.exec(gitConfig)) !== null) {
      const url = match[1].trim();

      // Extract owner/repo from GitHub URLs
      const githubRegex = /github\.com[\/:]([^\/]+)\/([^\/\s]+?)(\.git)?$/i;
      const githubMatch = url.match(githubRegex);

      if (githubMatch) {
        const owner = githubMatch[1];
        const repo = githubMatch[2];
        return `${owner}/${repo}`;
      }
    }
  } catch (error) {
    // Silently ignore if .git/config doesn't exist or can't be read
  }

  return null;
}

function createProjectThreadId(projectPath: string, projectName: string): string {
  const normalizedPath = projectPath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const hash = Math.abs(
    [...projectPath].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
  ).toString(36);

  return `${projectName}-${normalizedPath}-${hash}`.slice(0, 64);
}

function showHelp() {
  console.log(`
Available commands:
- Type any message to chat with the coding agent
- 'help' - show this help message
- 'clear' - clear the terminal screen
- 'exit' or 'quit' - exit the program

The agent has been initialized with your project context and can help you analyze and understand your codebase.
`);
}

function clearScreen() {
  console.clear();
}

async function showThinkingIndicator(duration: number = 2000): Promise<void> {
  const chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${chars[i]} Thinking...`);
    i = (i + 1) % chars.length;
  }, 100);

  await new Promise(resolve => setTimeout(resolve, duration));
  clearInterval(interval);
  process.stdout.write('\r' + ' '.repeat(15) + '\r'); // Clear the line
}

async function main() {
  // Detect project path from CLI args or use current directory
  const projectPath = (process.argv[2] && !process.argv[2].startsWith('--'))
    ? resolve(process.argv[2])
    : process.cwd();
  const projectName = basename(projectPath);
  const githubRepo = getGitHubRepoInfo(projectPath);
  const threadId = createProjectThreadId(projectPath, projectName);
  const resourceId = projectName;

  console.log('🤖 Coding Agent');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📁 Project: ${projectName}`);
  console.log(`📍 Path:    ${projectPath}`);
  if (githubRepo) {
    console.log(`🔗 GitHub:  github.com/${githubRepo}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Ready. Type a message or \'help\' for commands.');
  console.log();

  let agent: any;

  try {
    console.log('Initializing MCP client...');
    const originalStdout = process.stdout.write;
    const originalStderr = process.stderr.write;

    try {
      // Temporarily suppress MCP server and tool startup logs
      process.stdout.write = () => true;
      process.stderr.write = () => true;

      const mcpClient = createMCPClient(projectPath);
      agent = await createAgent(mcpClient);
    } finally {
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
    }

    console.log('✅ MCP client and agent initialized.');

  } catch (error) {
    console.log('⚠️  MCP client initialization failed, continuing without MCP tools...');
    console.log('Error:', error instanceof Error ? error.message : String(error));

    // Create agent without MCP client
    agent = await createAgent(null);
    console.log('✅ Agent initialized without MCP tools.');
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'coding-agent> '
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const command = input.trim().toLowerCase();

    try {
      if (command === 'exit' || command === 'quit') {
        console.log('👋 Goodbye!');
        rl.close();
        process.exit(0);
      } else if (command === 'help') {
        showHelp();
      } else if (command === 'clear') {
        clearScreen();
        console.log('🧹 Screen cleared!');
      } else if (command === '') {
        // Empty line, just prompt again
      } else {
        // Regular message to agent
        console.log('🤔 Processing...');
        await showThinkingIndicator(500);

        let fullQuery = '';
        if (githubRepo) {
          fullQuery += `GitHub Repository: ${githubRepo}\n\n`;
        }
        fullQuery += 'User question: ' + input;

        const result = await agent.generate(fullQuery, {
          memory: {
            thread: threadId,
            resource: resourceId,
          },
        });

        console.log('\n🤖 Agent:', result.text);
        console.log(); // Empty line for readability
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      console.log('💡 Try again or type "help" for available commands.\n');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Session ended. Have a great day!');
    process.exit(0);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n👋 Received SIGINT, exiting gracefully...');
    rl.close();
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

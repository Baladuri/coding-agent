#!/usr/bin/env node
import { createAgent } from './agent';
import { createMCPClient } from './mcp';
import { join, basename, resolve } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.coding-agent');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function loadConfig() {
  // First check environment variables (always takes priority)
  if (process.env.ANTHROPIC_API_KEY && process.env.GITHUB_TOKEN) {
    return;
  }

  // Then check home directory config
  if (existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      if (config.AI_PROVIDER) process.env.AI_PROVIDER = config.AI_PROVIDER;
      if (config.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = config.ANTHROPIC_API_KEY;
      if (config.GOOGLE_API_KEY) process.env.GOOGLE_API_KEY = config.GOOGLE_API_KEY;
      if (config.GITHUB_TOKEN) process.env.GITHUB_TOKEN = config.GITHUB_TOKEN;
    } catch (error) {
      // Silently ignore if config file is invalid
    }
  }
}

async function setupConfig() {
  // If keys still missing after loading, prompt user
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_API_KEY;
  const hasGitHub = !!process.env.GITHUB_TOKEN;

  if (!hasAnthropic && !hasGoogle && !hasGitHub) {
    console.log('\n⚙️  First time setup — API keys required\n');

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const question = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));

    // Ask for AI provider choice
    console.log('🤖 Which AI provider do you want to use?');
    console.log('1. Anthropic (Claude) - Requires paid API key');
    console.log('2. Google (Gemini) - Free tier available at aistudio.google.com');

    let providerChoice: string;
    let aiProvider: string;
    let apiKey: string;

    while (true) {
      providerChoice = await question('Enter choice (1 or 2): ');
      if (providerChoice === '1' || providerChoice === '2') {
        break;
      }
      console.log('Please enter 1 or 2.');
    }

    if (providerChoice === '1') {
      aiProvider = 'anthropic';
      apiKey = process.env.ANTHROPIC_API_KEY || (await question('📝 Enter your ANTHROPIC_API_KEY: '));
    } else {
      aiProvider = 'google';
      apiKey = process.env.GOOGLE_API_KEY || (await question('📝 Enter your GOOGLE_API_KEY: '));
    }

    const githubToken = process.env.GITHUB_TOKEN || (await question('📝 Enter your GITHUB_TOKEN: '));

    rl.close();

    mkdirSync(CONFIG_DIR, { recursive: true });

    const config: any = {
      AI_PROVIDER: aiProvider,
      GITHUB_TOKEN: githubToken,
    };

    if (aiProvider === 'anthropic') {
      config.ANTHROPIC_API_KEY = apiKey;
      process.env.ANTHROPIC_API_KEY = apiKey;
    } else {
      config.GOOGLE_API_KEY = apiKey;
      process.env.GOOGLE_API_KEY = apiKey;
    }

    process.env.AI_PROVIDER = aiProvider;
    process.env.GITHUB_TOKEN = githubToken;

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`✅ Config saved to ${CONFIG_FILE}\n`);
  }
}

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
  // Load config from home directory first
  loadConfig();
  // Then prompt for missing keys if needed
  await setupConfig();

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

      let mcpClient;
      try {
        // Set PROJECT_PATH for git tool
        process.env.PROJECT_PATH = projectPath;
        mcpClient = createMCPClient(projectPath, !!githubRepo);
        agent = await createAgent(mcpClient);
      } catch (error) {
        // Restore stdout/stderr before logging
        process.stdout.write = originalStdout;
        process.stderr.write = originalStderr;
        console.log('⚠️  GitHub MCP failed:', (error as Error).message);
        console.log('⚠️  Continuing with filesystem only...');
        mcpClient = createMCPClient(projectPath, false);
        agent = await createAgent(mcpClient);
        console.log('✅ Agent initialized with filesystem MCP tools only.');
      }
    } finally {
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
    }

    console.log('✅ MCP client and agent initialized.');

  } catch (error) {
    console.log('⚠️  MCP client initialization failed, continuing without MCP tools...');
    console.log('Error:', error instanceof Error ? error.message : String(error));

    // Create agent without MCP client
    process.env.PROJECT_PATH = projectPath;
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

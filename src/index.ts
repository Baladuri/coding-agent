import 'dotenv/config';
import { createAgent } from './agent';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

function getProjectStructure(dir: string, prefix = ''): string {
  let result = '';
  const items = readdirSync(dir);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const fullPath = join(dir, item);
    const isLast = i === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');

    result += prefix + connector + item + '\n';

    if (statSync(fullPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      result += getProjectStructure(fullPath, nextPrefix);
    }
  }

  return result;
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
  console.log('🚀 Welcome to the Coding Agent REPL!');
  console.log('=====================================');

  let agent: any;
  let projectContext = '';

  try {
    console.log('Creating agent...');
    agent = await createAgent();

    console.log('Loading project context...');
    // Get project structure
    const projectStructure = getProjectStructure(process.cwd());

    // Read key files
    const packageJson = readFileSync('package.json', 'utf-8');
    const tsconfigJson = readFileSync('tsconfig.json', 'utf-8');

    projectContext = `
Project structure:
${projectStructure}

package.json:
${packageJson}

tsconfig.json:
${tsconfigJson}

This is the current project context. Use this information to help answer user questions about the codebase.
`;

    console.log('✅ Agent initialized with project context!');
    showHelp();

  } catch (error) {
    console.error('❌ Failed to initialize agent:', error);
    process.exit(1);
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

        const fullQuery = projectContext + '\n\nUser: ' + input;
        const result = await agent.generate(fullQuery);

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

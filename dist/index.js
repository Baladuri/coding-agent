#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const agent_1 = require("./agent");
const mcp_1 = require("./mcp");
const fs_1 = require("fs");
const path_1 = require("path");
const readline_1 = require("readline");
function getProjectStructure(dir, prefix = '') {
    let result = '';
    const items = (0, fs_1.readdirSync)(dir);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const fullPath = (0, path_1.join)(dir, item);
        const isLast = i === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        result += prefix + connector + item + '\n';
        if ((0, fs_1.statSync)(fullPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            result += getProjectStructure(fullPath, nextPrefix);
        }
    }
    return result;
}
function getGitHubRepoInfo(projectPath) {
    try {
        const gitConfigPath = (0, path_1.join)(projectPath, '.git', 'config');
        const gitConfig = (0, fs_1.readFileSync)(gitConfigPath, 'utf-8');
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
    }
    catch (error) {
        // Silently ignore if .git/config doesn't exist or can't be read
    }
    return null;
}
function createProjectThreadId(projectPath, projectName) {
    const normalizedPath = projectPath
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const hash = Math.abs([...projectPath].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)).toString(36);
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
async function showThinkingIndicator(duration = 2000) {
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
    const projectPath = process.argv[2] ? (0, path_1.resolve)(process.argv[2]) : process.cwd();
    const projectName = (0, path_1.basename)(projectPath);
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
    let agent;
    let projectContext = '';
    try {
        console.log('Initializing MCP client...');
        const originalStdout = process.stdout.write;
        const originalStderr = process.stderr.write;
        try {
            // Temporarily suppress MCP server and tool startup logs
            process.stdout.write = () => true;
            process.stderr.write = () => true;
            const mcpClient = (0, mcp_1.createMCPClient)(projectPath);
            agent = await (0, agent_1.createAgent)(mcpClient);
        }
        finally {
            process.stdout.write = originalStdout;
            process.stderr.write = originalStderr;
        }
        console.log('✅ MCP client and agent initialized.');
        console.log('Loading project context...');
        // Get project structure
        const projectStructure = getProjectStructure(projectPath);
        // Read key files
        const packageJsonPath = (0, path_1.join)(projectPath, 'package.json');
        const tsconfigJsonPath = (0, path_1.join)(projectPath, 'tsconfig.json');
        let packageJson = '';
        let tsconfigJson = '';
        try {
            packageJson = (0, fs_1.readFileSync)(packageJsonPath, 'utf-8');
        }
        catch (e) {
            packageJson = 'package.json not found';
        }
        try {
            tsconfigJson = (0, fs_1.readFileSync)(tsconfigJsonPath, 'utf-8');
        }
        catch (e) {
            tsconfigJson = 'tsconfig.json not found';
        }
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
    }
    catch (error) {
        console.error('❌ Failed to initialize agent:', error instanceof Error ? error.stack || error.message : String(error));
        if (!(error instanceof Error)) {
            console.error(error);
        }
        process.exit(1);
    }
    const rl = (0, readline_1.createInterface)({
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
            }
            else if (command === 'help') {
                showHelp();
            }
            else if (command === 'clear') {
                clearScreen();
                console.log('🧹 Screen cleared!');
            }
            else if (command === '') {
                // Empty line, just prompt again
            }
            else {
                // Regular message to agent
                console.log('🤔 Processing...');
                await showThinkingIndicator(500);
                let fullQuery = projectContext;
                if (githubRepo) {
                    fullQuery += `\n\nGitHub Repository: ${githubRepo}`;
                }
                fullQuery += '\n\nUser question: ' + input;
                const result = await agent.generate(fullQuery, {
                    memory: {
                        thread: threadId,
                        resource: resourceId,
                    },
                });
                console.log('\n🤖 Agent:', result.text);
                console.log(); // Empty line for readability
            }
        }
        catch (error) {
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
//# sourceMappingURL=index.js.map
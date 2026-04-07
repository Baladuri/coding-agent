import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import { z } from 'zod';

const memoryDbPath = `file:${join(homedir(), '.coding-agent', 'memory.db')}`;

const gitTool = createTool({
  id: 'run_git_command',
  description: 'Runs a git command in the current project directory. Only git commands are allowed.',
  inputSchema: z.object({
    command: z.string().describe('The git command to run, must start with "git"'),
  }),
  execute: async ({ command }) => {
    if (!command.startsWith('git ')) {
      return { error: 'Only git commands are allowed' };
    }
    try {
      const output = execSync(command, {
        cwd: process.env.PROJECT_PATH,
        encoding: 'utf-8'
      });
      return { output };
    } catch (err: any) {
      return { error: err.stderr || err.message };
    }
  },
});

export async function createAgent(mcpClient: any) {
  let tools: any = {
    run_git_command: gitTool,
  };

  // Try to extract MCP tools if client supports it
  if (mcpClient) {
    try {
      // In Mastra v1, use listTools() to get available MCP tools
      if (typeof mcpClient.listTools === 'function') {
        const mcpTools = await mcpClient.listTools();
        if (Array.isArray(mcpTools)) {
          // Convert array of tools to object format with tool names as keys
          const toolsByName: any = {};
          mcpTools.forEach((tool: any) => {
            if (tool.name) {
              toolsByName[tool.name] = tool;
            }
          });
          tools = { ...tools, ...toolsByName };
        } else if (typeof mcpTools === 'object') {
          tools = { ...tools, ...mcpTools };
        }
      }
    } catch (error) {
      // Silently fail on MCP tools extraction
    }
  }

  // Debug: Log available tools
  console.log('Available tools:', Object.keys(tools));

  // Build list of available tools for agent awareness
  const availableTools = Object.keys(tools);
  const mcpToolList = availableTools
    .filter(name => name !== 'run_git_command')
    .join(', ');

  const memory = new Memory({
    storage: new LibSQLStore({ id: 'coding-agent-memory', url: memoryDbPath }),
    options: {
      lastMessages: 5,
      semanticRecall: false,
    },
  });

  const provider = process.env.AI_PROVIDER || 'anthropic';
  const model = provider === 'google'
    ? 'google/gemini-2.5-pro'
    : 'anthropic/claude-haiku-4-5';

  // Initialize workspace with skills
  const workspace = new Workspace({
    filesystem: new LocalFilesystem({
      basePath: join(__dirname, '..', 'skills'),
    }),
    skills: ['git-operations', 'pr-management', 'code-review'],
  });

  const agent = new Agent({
    id: 'coding-agent',
    name: 'coding-agent',
    instructions: `You are a coding agent with specialized skills for git operations, PR management, and code review. 

When the user asks about any of these topics, load and follow the relevant skill:
- Git operations (status, commit, push) → load /git-operations skill
- Pull requests (create, review, approve) → load /pr-management skill
- Code quality and reviews → load /code-review skill

You have access to ${mcpToolList} GitHub tools and run_git_command for local operations.

GENERAL RULES:
- NEVER read more than 2-3 files per response
- When asked about a project, list the top-level directory first - do NOT read files unless asked
- Never read: node_modules, dist, build, .git, vendor, coverage, __pycache__
- Read files one at a time, smallest/most relevant first
- Give concise answers - don't dump file contents
- ALWAYS ask confirmation before write operations (commit, push, posting reviews, creating PRs)
- NEVER run commands without explicit user request

When asked "what is this project":
1. List top level directory only
2. Read ONLY package.json or equivalent (composer.json, requirements.txt, etc.)
3. Give a 3-4 sentence summary based on that alone`,
    model,
    tools,
    memory,
    workspace,
  });

  // Attach tool info for debugging
  (agent as any).__availableTools = availableTools;
  (agent as any).__toolInfo = `Available tools (${availableTools.length}): ${availableTools.join(', ')}`;

  return agent;
}
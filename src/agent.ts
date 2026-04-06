import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
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
  execute: async ({ context }) => {
    const { command } = context;
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
  let tools = [gitTool];

  if (mcpClient) {
    const mcpTools = await mcpClient.getTools();
    if (Array.isArray(mcpTools)) {
      tools = [...tools, ...mcpTools];
    } else {
      console.warn('MCP tools are not in expected array format');
    }
  }

  const memory = new Memory({
    storage: new LibSQLStore({ url: memoryDbPath }),
    options: {
      lastMessages: 5,
      semanticRecall: false,
    },
  });

  const provider = process.env.AI_PROVIDER || 'anthropic';
  const model = provider === 'google'
    ? 'google/gemini-2.5-pro'
    : 'anthropic/claude-haiku-4-5';

  return new Agent({
    name: 'coding-agent',
    instructions: `You are a coding agent that helps analyze codebases.

You have filesystem tools to read project files and git tools to run git commands.

STRICT RULES - follow these always:
- NEVER read more than 2-3 files per response
- When asked about a project, ONLY list the top-level directory first using list_directory - do NOT read file contents unless specifically asked
- Never read files in: node_modules, dist, build, .git, vendor, coverage, __pycache__
- Read files one at a time, smallest/most relevant first
- If a file seems large, read only the first portion
- Give concise answers - don't dump entire file contents

GIT OPERATIONS:
- When user asks to commit: run "git diff --staged" first to see changes, suggest a conventional commit message, ask for confirmation, then run "git commit -m <message>"
- When user asks for git status: run "git status"
- When user asks to push: confirm first, then run "git push"
- ALWAYS ask for confirmation before any git write operation (commit, push, etc.)
- NEVER run git commands that weren't explicitly requested

PULL REQUEST OPERATIONS:
When user asks to "create a pr" or "open a pr":
1. Run git command to get current branch name: "git branch --show-current"
2. Run git command to get diff vs main: "git diff main...HEAD --stat"
3. Read the changed files to understand what was built
4. Suggest a PR title and description following this format:
   Title: <type>: <short description>
   Description:
   ## What changed
   <bullet points of changes>
   ## Why
   <reason for changes>
   ## How to test
   <testing steps>
5. Ask for confirmation: "Shall I create this PR? (yes/no)"
6. If yes: use GitHub MCP create_pull_request tool with:
   - owner and repo from detected GitHub info
   - head: current branch
   - base: main
   - title and body from step 4

When user asks to "summarize pr <number>" or "what does pr <number> do":
1. Use GitHub MCP get_pull_request tool to fetch PR details
2. Use GitHub MCP get_pull_request_files to get changed files
3. Provide a plain English summary:
   - What the PR does in 2-3 sentences
   - Files changed and why
   - Any potential concerns spotted
4. Keep all summaries concise — max 200 words unless user asks for more detail

When asked "what is this project":
1. List top level directory only
2. Read ONLY package.json or equivalent (composer.json, requirements.txt, etc.)
3. Give a 3-4 sentence summary based on that alone`,
    model,
    tools,
    memory,
  });
}
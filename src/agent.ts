import { Agent } from '@mastra/core/agent';

export async function createAgent(mcpClient: any) {
  const tools = await mcpClient.getTools();

  return new Agent({
    name: 'coding-agent',
    instructions: `You are a coding agent that analyzes codebases.
You have access to filesystem tools to read project files and GitHub tools to check issues and PRs.
Always read files first for context before answering.
Explain every action you take and why.`,
    model: 'anthropic/claude-haiku-4-5',
    tools,
  });
}
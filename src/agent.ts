import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export async function createAgent(mcpClient: any) {
  let tools = [];

  if (mcpClient) {
    tools = await mcpClient.getTools();
  }

  const memory = new Memory({
    storage: new LibSQLStore({ url: 'file:./memory.db' }),
    options: {
      lastMessages: 10,
      semanticRecall: false,
    },
  });

  return new Agent({
    name: 'coding-agent',
    instructions: `You are a coding agent that analyzes codebases.
${mcpClient ? 'You have access to filesystem tools to read project files and GitHub tools to check issues and PRs.' : 'MCP tools are not available, but you can still provide general coding assistance.'}
Always read files first for context before answering.
Explain every action you take and why.`,
    model: 'anthropic/claude-haiku-4-5',
    tools,
    memory,
  });
}
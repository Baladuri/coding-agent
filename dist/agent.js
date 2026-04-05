"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgent = createAgent;
const agent_1 = require("@mastra/core/agent");
const memory_1 = require("@mastra/memory");
const libsql_1 = require("@mastra/libsql");
async function createAgent(mcpClient) {
    let tools = [];
    if (mcpClient) {
        tools = await mcpClient.getTools();
    }
    const memory = new memory_1.Memory({
        storage: new libsql_1.LibSQLStore({ url: 'file:./memory.db' }),
        options: {
            lastMessages: 10,
            semanticRecall: false,
        },
    });
    return new agent_1.Agent({
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
//# sourceMappingURL=agent.js.map
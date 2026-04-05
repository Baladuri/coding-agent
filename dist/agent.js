"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgent = createAgent;
const agent_1 = require("@mastra/core/agent");
const memory_1 = require("@mastra/memory");
const libsql_1 = require("@mastra/libsql");
const os_1 = require("os");
const path_1 = require("path");
const memoryDbPath = `file:${(0, path_1.join)((0, os_1.homedir)(), '.coding-agent', 'memory.db')}`;
async function createAgent(mcpClient) {
    let tools = [];
    if (mcpClient) {
        tools = await mcpClient.getTools();
    }
    const memory = new memory_1.Memory({
        storage: new libsql_1.LibSQLStore({ url: memoryDbPath }),
        options: {
            lastMessages: 5,
            semanticRecall: false,
        },
    });
    return new agent_1.Agent({
        name: 'coding-agent',
        instructions: `You are a coding agent that helps analyze codebases.

You have filesystem tools to read project files.

STRICT RULES - follow these always:
- NEVER read more than 2-3 files per response
- When asked about a project, ONLY list the top-level directory first using list_directory - do NOT read file contents unless specifically asked
- Never read files in: node_modules, dist, build, .git, vendor, coverage, __pycache__
- Read files one at a time, smallest/most relevant first
- If a file seems large, read only the first portion
- Give concise answers - don't dump entire file contents

When asked "what is this project":
1. List top level directory only
2. Read ONLY package.json or equivalent (composer.json, requirements.txt, etc.)
3. Give a 3-4 sentence summary based on that alone`,
        model: 'anthropic/claude-haiku-4-5',
        tools,
        memory,
    });
}
//# sourceMappingURL=agent.js.map
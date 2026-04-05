"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMCPClient = createMCPClient;
const mcp_1 = require("@mastra/mcp");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
function createMCPClient(projectPath) {
    return new mcp_1.MCPClient({
        servers: {
            filesystem: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', projectPath],
                env: {},
            },
            github: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                env: {
                    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
                },
            },
        },
    });
}
//# sourceMappingURL=mcp.js.map
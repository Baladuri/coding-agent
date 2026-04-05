"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMCPClient = createMCPClient;
const mcp_1 = require("@mastra/mcp");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
function createMCPClient(projectPath) {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const servers = {
        filesystem: {
            command: npxCmd,
            args: ['-y', '@modelcontextprotocol/server-filesystem', projectPath],
            env: {},
        },
    };
    // Try to add GitHub server if token is available
    if (process.env.GITHUB_TOKEN) {
        servers.github = {
            command: npxCmd,
            args: ['-y', 'github-mcp-server'],
            env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
            },
        };
    }
    return new mcp_1.MCPClient({
        servers,
    });
}
//# sourceMappingURL=mcp.js.map
import { MCPClient } from '@mastra/mcp';
import { config } from 'dotenv';

config();

export const mcp = new MCPClient({
  servers: {
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
      env: {},
    },
    github: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN!,
      },
    },
  },
});
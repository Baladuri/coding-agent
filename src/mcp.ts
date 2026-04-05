import { MCPClient } from '@mastra/mcp';
import { config } from 'dotenv';

config();

export function createMCPClient(projectPath: string) {
  return new MCPClient({
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
          GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN!,
        },
      },
    },
  });
}
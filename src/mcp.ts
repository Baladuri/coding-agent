import { MCPClient } from '@mastra/mcp';

export function createMCPClient(projectPath: string) {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  const servers: any = {
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

  return new MCPClient({
    servers,
  });
}
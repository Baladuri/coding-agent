import { MCPClient } from '@mastra/mcp';

export function createMCPClient(projectPath: string, isGitHub: boolean = false) {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  const servers: any = {
    filesystem: {
      command: npxCmd,
      args: ['-y', '@modelcontextprotocol/server-filesystem', projectPath],
      env: {},
    },
  };

  // Only add GitHub server if it's a GitHub repo and token is available
  if (isGitHub && process.env.GITHUB_TOKEN) {
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
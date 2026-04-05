import 'dotenv/config';
import { createAgent } from './agent';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function getProjectStructure(dir: string, prefix = ''): string {
  let result = '';
  const items = readdirSync(dir);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const fullPath = join(dir, item);
    const isLast = i === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');

    result += prefix + connector + item + '\n';

    if (statSync(fullPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      result += getProjectStructure(fullPath, nextPrefix);
    }
  }

  return result;
}

async function main() {
  console.log('Creating agent...');
  const agent = await createAgent();

  // Get project structure
  const projectStructure = getProjectStructure(process.cwd());

  // Read key files
  const packageJson = readFileSync('package.json', 'utf-8');
  const tsconfigJson = readFileSync('tsconfig.json', 'utf-8');

  const query = `
Project structure:
${projectStructure}

package.json:
${packageJson}

tsconfig.json:
${tsconfigJson}

Please analyze this project and summarize what it does.
`;

  console.log('Running query...');
  const result = await agent.generate(query);
  console.log('Response:', result.text);
}

main().catch(console.error);

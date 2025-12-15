#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';

class TerminalServer {
  constructor(allowedCommands = []) {
    this.allowedCommands = allowedCommands;
    this.server = new Server(
      {
        name: 'terminal-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  isCommandAllowed(command) {
    if (this.allowedCommands.length === 0) return true;
    const baseCommand = command.split(' ')[0];
    return this.allowedCommands.includes(baseCommand);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'run_command',
            description: 'Execute a terminal command',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Command to execute',
                },
                cwd: {
                  type: 'string',
                  description: 'Working directory for the command',
                },
                timeout: {
                  type: 'number',
                  description: 'Command timeout in milliseconds',
                  default: 30000,
                },
              },
              required: ['command'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'run_command': {
            const { command, cwd, timeout = 30000 } = args;

            if (!this.isCommandAllowed(command)) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Command not allowed: ${command}`
              );
            }

            const result = await this.executeCommand(command, cwd, timeout);

            return {
              content: [
                { type: 'text', text: `Exit code: ${result.code}\n\nOutput:\n${result.stdout}` },
                result.stderr ? { type: 'text', text: `Errors:\n${result.stderr}` } : null,
              ].filter(Boolean),
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  executeCommand(command, cwd, timeout) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        cwd: cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Terminal MCP server running...');
  }
}

// Get allowed commands from environment or use defaults
const allowedCommands = process.env.ALLOWED_COMMANDS
  ? process.env.ALLOWED_COMMANDS.split(',')
  : [];

const server = new TerminalServer(allowedCommands);
server.run().catch(console.error);
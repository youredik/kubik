#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { readdir, readFile, stat, writeFile, mkdir, unlink } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { existsSync } from 'fs';

class FilesystemServer {
  constructor(allowedDirectories = []) {
    this.allowedDirectories = allowedDirectories.map(dir => resolve(dir));
    this.server = new Server(
      {
        name: 'filesystem-server',
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

  isPathAllowed(filePath) {
    const resolvedPath = resolve(filePath);
    return this.allowedDirectories.some(allowedDir =>
      resolvedPath.startsWith(allowedDir)
    );
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Read contents of a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to read',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'list_dir',
            description: 'List contents of a directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the directory to list',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'write_file',
            description: 'Write content to a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to write',
                },
                content: {
                  type: 'string',
                  description: 'Content to write to the file',
                },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'create_dir',
            description: 'Create a directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the directory to create',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'delete_file',
            description: 'Delete a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to delete',
                },
              },
              required: ['path'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_file': {
            const { path } = args;
            if (!this.isPathAllowed(path)) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Access denied: ${path}`
              );
            }

            const content = await readFile(path, 'utf-8');
            return {
              content: [{ type: 'text', text: content }],
            };
          }

          case 'list_dir': {
            const { path } = args;
            if (!this.isPathAllowed(path)) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Access denied: ${path}`
              );
            }

            const entries = await readdir(path);
            const detailedEntries = await Promise.all(
              entries.map(async (entry) => {
                const fullPath = join(path, entry);
                const stats = await stat(fullPath);
                return {
                  name: entry,
                  type: stats.isDirectory() ? 'directory' : 'file',
                  size: stats.size,
                  modified: stats.mtime.toISOString(),
                };
              })
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(detailedEntries, null, 2) }],
            };
          }

          case 'write_file': {
            const { path, content } = args;
            if (!this.isPathAllowed(path)) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Access denied: ${path}`
              );
            }

            // Ensure directory exists
            const dir = dirname(path);
            if (!existsSync(dir)) {
              await mkdir(dir, { recursive: true });
            }

            await writeFile(path, content, 'utf-8');
            return {
              content: [{ type: 'text', text: `File written successfully: ${path}` }],
            };
          }

          case 'create_dir': {
            const { path } = args;
            if (!this.isPathAllowed(path)) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Access denied: ${path}`
              );
            }

            await mkdir(path, { recursive: true });
            return {
              content: [{ type: 'text', text: `Directory created: ${path}` }],
            };
          }

          case 'delete_file': {
            const { path } = args;
            if (!this.isPathAllowed(path)) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Access denied: ${path}`
              );
            }

            await unlink(path);
            return {
              content: [{ type: 'text', text: `File deleted: ${path}` }],
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP server running...');
  }
}

// Get allowed directories from command line arguments or use defaults
const allowedDirs = process.argv.slice(2);
if (allowedDirs.length === 0) {
  allowedDirs.push(process.cwd());
}

const server = new FilesystemServer(allowedDirs);
server.run().catch(console.error);
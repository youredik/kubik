#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';

class BrowserServer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.server = new Server(
      {
        name: 'browser-server',
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

  async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    if (!this.page) {
      this.page = await this.browser.newPage();
    }
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'navigate',
            description: 'Navigate to a URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to navigate to',
                },
                waitUntil: {
                  type: 'string',
                  enum: ['load', 'domcontentloaded', 'networkidle'],
                  default: 'load',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'screenshot',
            description: 'Take a screenshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector to screenshot specific element',
                },
                fullPage: {
                  type: 'boolean',
                  description: 'Take full page screenshot',
                  default: true,
                },
              },
            },
          },
          {
            name: 'click',
            description: 'Click on an element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector of element to click',
                },
                waitFor: {
                  type: 'string',
                  enum: ['load', 'domcontentloaded', 'networkidle'],
                  default: 'load',
                },
              },
              required: ['selector'],
            },
          },
          {
            name: 'type_text',
            description: 'Type text into an input field',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector of input element',
                },
                text: {
                  type: 'string',
                  description: 'Text to type',
                },
                clear: {
                  type: 'boolean',
                  description: 'Clear field before typing',
                  default: true,
                },
              },
              required: ['selector', 'text'],
            },
          },
          {
            name: 'get_text',
            description: 'Get text content from an element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector of element',
                },
              },
              required: ['selector'],
            },
          },
          {
            name: 'get_html',
            description: 'Get HTML content from an element or page',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector of element (optional - gets whole page if not specified)',
                },
              },
            },
          },
          {
            name: 'wait_for_selector',
            description: 'Wait for an element to appear',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector to wait for',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 10000,
                },
              },
              required: ['selector'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.ensureBrowser();

        switch (name) {
          case 'navigate': {
            const { url, waitUntil = 'load' } = args;
            await this.page.goto(url, { waitUntil });
            const title = await this.page.title();
            const url_ = this.page.url();

            return {
              content: [{ type: 'text', text: `Navigated to ${url_}\nTitle: ${title}` }],
            };
          }

          case 'screenshot': {
            const { selector, fullPage = true } = args;
            let screenshotBuffer;

            if (selector) {
              const element = await this.page.locator(selector).first();
              screenshotBuffer = await element.screenshot();
            } else {
              screenshotBuffer = await this.page.screenshot({ fullPage });
            }

            // Convert to base64 for text response
            const base64Image = screenshotBuffer.toString('base64');

            return {
              content: [
                { type: 'text', text: `Screenshot taken (${screenshotBuffer.length} bytes)` },
                { type: 'image', data: base64Image, mimeType: 'image/png' },
              ],
            };
          }

          case 'click': {
            const { selector, waitFor = 'load' } = args;
            await this.page.locator(selector).first().click();
            await this.page.waitForLoadState(waitFor);

            return {
              content: [{ type: 'text', text: `Clicked element: ${selector}` }],
            };
          }

          case 'type_text': {
            const { selector, text, clear = true } = args;
            const element = this.page.locator(selector).first();

            if (clear) {
              await element.clear();
            }

            await element.type(text);

            return {
              content: [{ type: 'text', text: `Typed "${text}" into ${selector}` }],
            };
          }

          case 'get_text': {
            const { selector } = args;
            const text = await this.page.locator(selector).first().textContent();

            return {
              content: [{ type: 'text', text: text || '' }],
            };
          }

          case 'get_html': {
            const { selector } = args;
            let html;

            if (selector) {
              html = await this.page.locator(selector).first().innerHTML();
            } else {
              html = await this.page.content();
            }

            return {
              content: [{ type: 'text', text: html }],
            };
          }

          case 'wait_for_selector': {
            const { selector, timeout = 10000 } = args;
            await this.page.waitForSelector(selector, { timeout });

            return {
              content: [{ type: 'text', text: `Element found: ${selector}` }],
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
          `Browser operation failed: ${error.message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Browser Automation MCP server running...');
  }

  async cleanup() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

const server = new BrowserServer();

// Cleanup on exit
process.on('SIGINT', async () => {
  await server.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.cleanup();
  process.exit(0);
});

server.run().catch(console.error);
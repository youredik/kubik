#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

class WebReaderServer {
  constructor(allowedDomains = []) {
    this.allowedDomains = allowedDomains;
    this.server = new Server(
      {
        name: 'web-reader-server',
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

  isDomainAllowed(url) {
    if (this.allowedDomains.length === 0) return true;

    try {
      const urlObj = new URL(url);
      return this.allowedDomains.some(domain =>
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'fetch_webpage',
            description: 'Fetch and extract content from a webpage',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL of the webpage to fetch',
                },
                extractText: {
                  type: 'boolean',
                  description: 'Extract readable text content',
                  default: true,
                },
                extractLinks: {
                  type: 'boolean',
                  description: 'Extract all links from the page',
                  default: false,
                },
                extractImages: {
                  type: 'boolean',
                  description: 'Extract image URLs from the page',
                  default: false,
                },
                selector: {
                  type: 'string',
                  description: 'CSS selector to extract specific content',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'search_web',
            description: 'Search for information on the web',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 5,
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'fetch_webpage': {
            const { url, extractText = true, extractLinks = false, extractImages = false, selector } = args;

            if (!this.isDomainAllowed(url)) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Domain not allowed: ${url}`
              );
            }

            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MCP Web Reader)',
              },
              timeout: 10000,
            });

            if (!response.ok) {
              throw new McpError(
                ErrorCode.InternalError,
                `Failed to fetch ${url}: ${response.status}`
              );
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            let result = {
              url,
              title: $('title').text().trim(),
              content: {},
            };

            if (extractText) {
              // Remove script and style elements
              $('script, style, nav, header, footer, aside').remove();

              if (selector) {
                result.content.text = $(selector).text().trim();
              } else {
                result.content.text = $('body').text().replace(/\s+/g, ' ').trim();
              }
            }

            if (extractLinks) {
              const links = [];
              $('a[href]').each((_, element) => {
                const href = $(element).attr('href');
                const text = $(element).text().trim();
                if (href) {
                  links.push({ url: href, text });
                }
              });
              result.content.links = links;
            }

            if (extractImages) {
              const images = [];
              $('img[src]').each((_, element) => {
                const src = $(element).attr('src');
                const alt = $(element).attr('alt') || '';
                if (src) {
                  images.push({ url: src, alt });
                }
              });
              result.content.images = images;
            }

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'search_web': {
            const { query, maxResults = 5 } = args;

            // Simple search implementation using DuckDuckGo
            const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

            const response = await fetch(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MCP Web Search)',
              },
              timeout: 10000,
            });

            if (!response.ok) {
              throw new McpError(
                ErrorCode.InternalError,
                `Search failed: ${response.status}`
              );
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            const results = [];
            $('.result__title a').each((index, element) => {
              if (index >= maxResults) return false;

              const title = $(element).text().trim();
              const url = $(element).attr('href');

              if (title && url) {
                results.push({
                  title,
                  url: url.startsWith('//') ? 'https:' + url : url,
                });
              }
            });

            return {
              content: [{ type: 'text', text: JSON.stringify({ query, results }, null, 2) }],
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
    console.error('Web Reader MCP server running...');
  }
}

// Get allowed domains from environment
const allowedDomains = process.env.ALLOWED_DOMAINS
  ? process.env.ALLOWED_DOMAINS.split(',')
  : [];

const server = new WebReaderServer(allowedDomains);
server.run().catch(console.error);
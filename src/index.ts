#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import minimist from "minimist";
import * as fs from "fs";
import * as path from "path";

// Parse command-line arguments
const args = minimist(process.argv.slice(2), {
  string: ['api-key', 'cwd'],
  alias: {
    'api-key': 'apiKey'
  }
});

// Extracts PERPLEXITY_API_KEY from an .env file content
function extractApiKey(content: string): string | null {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Look specifically for PERPLEXITY_API_KEY
    if (trimmed.startsWith('PERPLEXITY_API_KEY=')) {
      const value = trimmed.substring('PERPLEXITY_API_KEY='.length).trim();

      // Remove surrounding quotes if present
      let clean = value;
      if ((clean.startsWith('"') && clean.endsWith('"')) ||
        (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.slice(1, -1);
      }

      if (clean && clean.length > 0) {
        return clean;
      }
    }
  }

  return null;
}

// Read .env file from specified directory and extract PERPLEXITY_API_KEY.
// Returns null if file does not exist or does not contain PERPLEXITY_API_KEY.
function readEnvFile(dir: string): string | null {
  const envPath = path.join(dir, '.env');

  if (!fs.existsSync(envPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    return extractApiKey(content);
  } catch (error) {
    return null;
  }
}

/**
 * Resolves API key using simple three-step logic. Priority:
 * 1. Command-line argument (--api-key),
 * 2. Environment variable (PERPLEXITY_API_KEY),
 * 3. .env file with --cwd (fallback option)
 */
function getApiKey(): string {
  // 1. Command-line argument (highest priority)
  if (args['api-key']) {
    sanitizeArgs();
    return args['api-key'];
  }

  // 2. Environment variable
  if (process.env.PERPLEXITY_API_KEY) {
    return process.env.PERPLEXITY_API_KEY;
  }

  // 3. .env file (with --cwd PROJECT_DIR specified)
  if (args.cwd) {
    const key = readEnvFile(args.cwd);
    if (key) return key;
  }

  // Error if none found
  throw new Error(`
Perplexity API key is required. Please provide it using one of these three methods (in priority order):

1. Environment variable (PREFERRED): PERPLEXITY_API_KEY=your-api-key
2. Command-line argument: --api-key your-api-key  
3. .env file with --cwd: Create .env file with PERPLEXITY_API_KEY=your-api-key and specify directory

Examples:
• Environment variable: export PERPLEXITY_API_KEY="your-key-here" && npx perplexity-mcp
• Command-line: npx perplexity-mcp --api-key "your-key-here"
• .env file: npx perplexity-mcp --cwd /path/to/project

The environment variable method is preferred and most secure for production use.
Note: Automatic .env file discovery has been removed - you must use --cwd to specify the directory.
  `.trim());
}

// Overwrites API key arguments in process.argv to minimize exposure in process list
// This reduces the window where the API key is visible to other processes
function sanitizeArgs(): void {
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--api-key' && i + 1 < process.argv.length) {
      process.argv[i + 1] = '***REDACTED***';
    } else if (process.argv[i].startsWith('--api-key=')) {
      process.argv[i] = '--api-key=***REDACTED***';
    }
  }
}

const PERPLEXITY_API_KEY = getApiKey();

class PerplexityServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "perplexity-server",
        version: "0.2.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: "https://api.perplexity.ai",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Determines the complexity of a query to choose the appropriate model
   */
  private determineQueryComplexity(query: string): "simple" | "complex" | "research" {
    // Check for research indicators
    const researchIndicators = [
      "analyze", "research", "investigate", "study", "examine", "explore",
      "comprehensive", "detailed", "in-depth", "thorough",
      "compare and contrast", "evaluate", "assess"
    ];

    // Check for complex reasoning indicators
    const complexIndicators = [
      "how", "why", "what if", "explain", "solve", "steps to",
      "difference between", "compare", "which is better",
      "pros and cons", "advantages", "disadvantages"
    ];

    const query_lower = query.toLowerCase();

    // Check for research patterns
    if (researchIndicators.some(indicator => query_lower.includes(indicator))) {
      return "research";
    }

    // Check for complex patterns
    if (complexIndicators.some(indicator => query_lower.includes(indicator))) {
      return "complex";
    }

    // Default to simple if no complex/research patterns found
    return "simple";
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search",
          description: "Quick search for simple queries using Perplexity's Sonar Pro model. Best for straightforward questions and basic information lookup.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query or question"
              },
              force_model: {
                type: "boolean",
                description: "Optional: Force using this model even if query seems complex",
                default: false
              }
            },
            required: ["query"]
          }
        },
        {
          name: "reason",
          description: "Handles complex, multi-step tasks using Perplexity's Sonar Reasoning Pro model. Best for explanations, comparisons, and problem-solving.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The complex query or task to reason about"
              },
              force_model: {
                type: "boolean",
                description: "Optional: Force using this model even if query seems simple/research-oriented",
                default: false
              }
            },
            required: ["query"]
          }
        },
        {
          name: "deep_research",
          description: "Conducts in-depth analysis and generates detailed reports using Perplexity's Sonar Deep Research model. Best for comprehensive research topics.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The research topic or question to investigate in depth"
              },
              focus_areas: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Optional: Specific aspects or areas to focus on"
              },
              force_model: {
                type: "boolean",
                description: "Optional: Force using this model even if query seems simple",
                default: false
              }
            },
            required: ["query"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { query, force_model = false } = request.params.arguments as {
          query: string;
          force_model?: boolean;
        };

        // Determine which model to use based on query complexity
        let selectedTool = request.params.name;
        if (!force_model && selectedTool === "search") {
          const complexity = this.determineQueryComplexity(query);
          if (complexity === "complex") {
            selectedTool = "reason";
          } else if (complexity === "research") {
            selectedTool = "deep_research";
          }
        }

        let model: string;
        let prompt: string;

        switch (selectedTool) {
          case "search": {
            model = "sonar-pro";
            prompt = `Provide a clear, concise answer to: ${query}`;
            break;
          }

          case "reason": {
            model = "sonar-reasoning-pro";
            prompt = `Provide a detailed explanation and analysis for: ${query}. Include:
            1. Step-by-step reasoning
            2. Key considerations
            3. Relevant examples
            4. Practical implications
            5. Potential alternatives`;
            break;
          }

          case "deep_research": {
            model = "sonar-deep-research";
            const { focus_areas = [] } = request.params.arguments as { focus_areas?: string[] };

            prompt = `Conduct comprehensive research on: ${query}`;

            if (focus_areas.length > 0) {
              prompt += `\n\nFocus areas:\n${focus_areas.map((area, i) => `${i + 1}. ${area}`).join('\n')}`;
            }

            prompt += `\n\nProvide a detailed analysis including:
            1. Background and context
            2. Key concepts and definitions
            3. Current state of knowledge
            4. Different perspectives
            5. Recent developments
            6. Practical applications
            7. Challenges and limitations
            8. Future directions
            9. Expert opinions
            10. References to sources`;
            break;
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }

        const response = await this.axiosInstance.post("/chat/completions", {
          model,
          messages: [{ role: "user", content: prompt }],
        });

        // response.data can have a string[] .citations
        // these are referred to in the return text as numbered citations e.g. [1]
        const sourcesText = response.data.citations
          ? `\n\n## Sources\nPlease keep the numbered citations inline.\n${response.data.citations
            .map((c: string, i: number) => `${i + 1}: ${c}`)
            .join("\n")}`
          : "";

        return {
          content: [{
            type: "text",
            text: response.data.choices[0].message.content + sourcesText,
          }]
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new McpError(
            ErrorCode.InternalError,
            `Perplexity API error: ${error.response?.data?.error?.message || error.message}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Perplexity MCP server running on stdio");
  }
}

const server = new PerplexityServer();
server.run().catch(console.error);

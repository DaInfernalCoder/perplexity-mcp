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
        version: "0.2.2",
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
   * Checks if a query contains specific details needed for accurate responses
   * Returns array of missing details, empty if sufficient
   */
  private detectMissingDetails(query: string): string[] {
    const queryLower = query.toLowerCase();
    const missingDetails: string[] = [];

    // Check for error messages, stack traces, or error-related terms
    const hasErrors = /error|exception|failure|crash|traceback|stack trace|failed/i.test(query) ||
                     /Error:|Exception:|at\s+\w+\.\w+/i.test(query);
    
    // Check for code snippets (common patterns)
    const hasCode = /```|function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+|import\s+|require\(|\.\w+\(/i.test(query) ||
                    /[a-z]\w*\([^)]*\)/i.test(query) || // function calls
                    /\w+\.\w+\s*=/i.test(query); // property assignments

    // Check for version numbers
    const hasVersions = /\d+\.\d+(\.\d+)?/i.test(query) || /version\s*\d+|v\d+/i.test(query);

    // Check for specific API/function names (camelCase, PascalCase, or names with dots)
    const hasSpecificNames = /[A-Z][a-z]+[A-Z]|\.\w+\(|::\w+|api\.|sdk\./i.test(query);

    // Check for logs or console output
    const hasLogs = /log|console|output|print|trace|debug/i.test(query) && 
                    (query.length > 100 || /\n/.test(query));

    // Check for environment/platform details
    const hasEnvironment = /node|python|java|javascript|typescript|react|vue|angular|linux|windows|macos|ubuntu|docker/i.test(queryLower);

    // Determine missing details for technical queries
    if (hasErrors && !hasCode && !hasLogs) {
      missingDetails.push("code snippets showing the error context");
      missingDetails.push("relevant logs or stack traces");
    }
    
    if (!hasVersions && (hasCode || hasEnvironment)) {
      missingDetails.push("version numbers (framework, library, runtime versions)");
    }

    if (!hasSpecificNames && (hasCode || hasErrors)) {
      missingDetails.push("exact function names, API endpoints, or library names");
    }

    if (hasErrors && !hasEnvironment) {
      missingDetails.push("environment details (OS, runtime version, framework)");
    }

    // If query seems technical/problem-solving but lacks specifics
    const seemsTechnical = hasErrors || hasCode || /problem|issue|bug|fix|solution|how to|why|debug/i.test(queryLower);
    
    if (seemsTechnical && missingDetails.length === 0) {
      // Still check if it could be more specific
      if (query.length < 50 && !hasCode && !hasErrors) {
        missingDetails.push("specific error messages or code snippets");
        missingDetails.push("exact terminology and context");
      }
    }

    return missingDetails;
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
                description: "The search query or question. IMPORTANT: Be extremely specific and include all relevant details:\n- Include exact error messages, logs, and stack traces if applicable\n- Provide exact terminology, function names, API names, version numbers\n- Include relevant code snippets showing the problem or context\n- Specify platform, OS, framework versions, and environment details\n- Mention any attempted solutions or workarounds\n- Provide context about what you're trying to achieve\n\nThe more specific details you include, the more accurate and helpful the answer will be.\nIf you don't have enough specific information, prompt the user to provide it before using this tool."
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
                description: "The complex query or task to reason about. IMPORTANT: Be extremely specific and include all relevant details:\n- Include exact error messages, logs, and stack traces if applicable\n- Provide exact terminology, function names, API names, version numbers\n- Include relevant code snippets showing the problem or context\n- Specify platform, OS, framework versions, and environment details\n- Mention any attempted solutions or workarounds\n- Provide context about what you're trying to achieve\n- Include relevant data structures, configurations, or inputs\n\nThe more specific details you include, the more accurate and helpful the answer will be.\nIf you don't have enough specific information, prompt the user to provide it before using this tool."
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
                description: "The research topic or question to investigate in depth. IMPORTANT: Be extremely specific and include all relevant details:\n- Include exact error messages, logs, and stack traces if applicable\n- Provide exact terminology, function names, API names, version numbers\n- Include relevant code snippets showing the problem or context\n- Specify platform, OS, framework versions, and environment details\n- Mention any attempted solutions or workarounds\n- Provide context about what you're trying to achieve\n- Include relevant data structures, configurations, or inputs\n- Specify the scope, constraints, or specific requirements\n\nThe more specific details you include, the more accurate and helpful the answer will be.\nIf you don't have enough specific information, prompt the user to provide it before using this tool."
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
            prompt = `You are answering a query that contains specific details like error messages, logs, code snippets, exact terminology, version numbers, and context. Use all provided details to give the most accurate answer possible.

Query: ${query}

Provide a clear, concise answer that directly addresses the specific details in the query.`;
            break;
          }

          case "reason": {
            model = "sonar-reasoning-pro";
            prompt = `You are answering a query that contains specific details like error messages, logs, code snippets, exact terminology, version numbers, and context. Carefully analyze all provided details to give the most accurate and helpful answer.

Query: ${query}

Provide a detailed explanation and analysis that:
1. Addresses the specific details provided (errors, logs, code, versions, etc.)
2. Includes step-by-step reasoning based on the actual context
3. Identifies key considerations relevant to the specific situation
4. Provides relevant examples matching the described scenario
5. Offers practical implications based on the exact details provided
6. Suggests potential alternatives or solutions tailored to the specific context`;
            break;
          }

          case "deep_research": {
            model = "sonar-deep-research";
            const { focus_areas = [] } = request.params.arguments as { focus_areas?: string[] };

            prompt = `You are answering a research query that contains specific details like error messages, logs, code snippets, exact terminology, version numbers, and context. Use all provided details to conduct the most accurate and comprehensive research.

Research Query: ${query}`;

            if (focus_areas.length > 0) {
              prompt += `\n\nFocus areas:\n${focus_areas.map((area, i) => `${i + 1}. ${area}`).join('\n')}`;
            }

            prompt += `\n\nProvide a detailed analysis that:
1. Incorporates and addresses all specific details provided (errors, logs, code, versions, configurations, etc.)
2. Provides background and context relevant to the specific scenario described
3. Defines key concepts and terminology matching the exact terms used
4. Presents the current state of knowledge relevant to the specific problem or topic
5. Explores different perspectives applicable to the described situation
6. Covers recent developments that relate to the specific details provided
7. Discusses practical applications relevant to the exact context
8. Identifies challenges and limitations specific to the scenario
9. Suggests future directions or solutions based on the specific details
10. Includes expert opinions and references to sources that address the specific issue
11. Tailors all recommendations to the exact technical context, versions, and environment described`;
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

        // Detect what details were missing from the original query
        const missingDetails = this.detectMissingDetails(query);

        // response.data can have a string[] .citations
        // these are referred to in the return text as numbered citations e.g. [1]
        const sourcesText = response.data.citations
          ? `\n\n## Sources\nPlease keep the numbered citations inline.\n${response.data.citations
            .map((c: string, i: number) => `${i + 1}: ${c}`)
            .join("\n")}`
          : "";

        // Add note about missing details if any were detected
        let responseText = response.data.choices[0].message.content + sourcesText;
        
        if (missingDetails.length > 0) {
          const missingList = missingDetails.map((detail, i) => `${i + 1}. ${detail}`).join('\n');
          responseText += `\n\n---\n\n**Note**: I didn't have the following details which would help provide a more specific and accurate answer:\n\n${missingList}\n\nIf you'd like a more precise response, please provide these details and ask again.`;
        }

        return {
          content: [{
            type: "text",
            text: responseText,
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

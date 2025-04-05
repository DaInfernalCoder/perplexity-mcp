# MCP-researcher Server
[![smithery badge](https://smithery.ai/badge/@DaInfernalCoder/perplexity-mcp)](https://smithery.ai/server/@DaInfernalCoder/perplexity-mcp) 

Your own research assistant inside of Cline! Utilizes Perplexity's new Sonar Pro API to get docs, create up-to-date api routes, and check deprecated code while you create features with Cline. Features automatic query complexity detection to route requests to the most appropriate model for optimal results.

Includes Chain of Thought Reasoning and local chat history through SQLite thanks to Lix for the idea :)

Check out our article about perplexity mcp! 
https://cline.bot/blog/supercharge-cline-3-ways-to-build-better-with-perplexity-mcp

<a href="https://glama.ai/mcp/servers/g1i6ilg8sl"><img width="380" height="200" src="https://glama.ai/mcp/servers/g1i6ilg8sl/badge" alt="MCP-researcher Server MCP server" /></a>

## Tools

### 1. Search (Sonar Pro)
Quick search for simple queries and basic information lookup. Best for straightforward questions that need concise, direct answers.

```javascript
const result = await use_mcp_tool({
  server_name: "perplexity",
  tool_name: "search",
  arguments: {
    query: "What is the capital of France?",
    force_model: false // Optional: force using this model even if query seems complex
  }
});
```

### 2. Reason (Sonar Reasoning Pro)
Handles complex, multi-step tasks requiring detailed analysis. Perfect for explanations, comparisons, and problem-solving.

```javascript
const result = await use_mcp_tool({
  server_name: "perplexity",
  tool_name: "reason",
  arguments: {
    query: "Compare and contrast REST and GraphQL APIs, explaining their pros and cons",
    force_model: false // Optional: force using this model even if query seems simple
  }
});
```

### 3. Deep Research (Sonar Deep Research)
Conducts comprehensive research and generates detailed reports. Ideal for in-depth analysis of complex topics.

```javascript
const result = await use_mcp_tool({
  server_name: "perplexity",
  tool_name: "deep_research",
  arguments: {
    query: "The impact of quantum computing on cryptography",
    focus_areas: [
      "Post-quantum cryptographic algorithms",
      "Timeline for quantum threats",
      "Practical mitigation strategies"
    ],
    force_model: false // Optional: force using this model even if query seems simple
  }
});
```

## Intelligent Model Selection

The server automatically analyzes query complexity to route requests to the most appropriate model:

1. **Simple Queries** → Sonar Pro
   - Basic information lookup
   - Straightforward questions
   - Quick facts

2. **Complex Queries** → Sonar Reasoning Pro
   - How/why questions
   - Comparisons
   - Step-by-step explanations
   - Problem-solving tasks

3. **Research Queries** → Sonar Deep Research
   - In-depth analysis
   - Comprehensive research
   - Detailed investigations
   - Multi-faceted topics

You can override the automatic selection using `force_model: true` in any tool's arguments.

### Installing via Smithery

To install MCP-researcher Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@DaInfernalCoder/perplexity-mcp):

```bash
npx -y @smithery/cli install @DaInfernalCoder/perplexity-mcp --client claude
```

## Setup

1. **Prerequisites**
   - Node.js (from [nodejs.org](https://nodejs.org))
   - Perplexity API key (from [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api))

2. **Configure MCP Settings**

Add to your MCP settings file (location varies by platform):

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "node",
      "args": ["/path/to/perplexity-server/build/index.js"],
      "env": {
        "PERPLEXITY_API_KEY": "YOUR_API_KEY_HERE"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Settings file locations:
- Cursor: 
  - macOS: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
  - Windows: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
  - Linux: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Claude Desktop:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%/Claude/claude_desktop_config.json`

Or use NPX to not have to install it locally: 
```json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": [
        "-y",
        "perplexity-mcp"
      ],
      "env": {
        "PERPLEXITY_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Start: `npm start`
5. put in the api key

or
1. use the npx command and put in the api key

## Testing

- Type checking: `npm test`
- Manual testing: `npm run inspector`

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=DaInfernalCoder/perplexity-mcp&type=Date)](https://www.star-history.com/#DaInfernalCoder/perplexity-mcp&Date)

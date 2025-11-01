# Perplexity MCP Server

An intelligent research assistant powered by Perplexity's specialized AI models. Features automatic query complexity detection to route requests to the most appropriate model for optimal results. Unlike the Official server, it has search capabilities FOR EVERY TASK, essentially 

It also forces the agent using the MCP to be specific

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

## Setup

1. **Prerequisites**
   - Node.js (from [nodejs.org](https://nodejs.org))
   - Perplexity API key (from [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api))
   - clone the repo somewhere

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


Or use NPX to not have to install it locally (recommended for macos): 

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
In case the MCP Client is not able to parse the Perplexity API Key from the
environment using methods like `"${env:PERPLEXITY_API_KEY}"` common in modern
AI Coding Agents (e.g. Kiro), there are two fallback solutions:

**Command-Line Argument**: Pass the API key directly as a command-line argument, and you can even try to see whether "${env:PERPLEXITY_API_KEY}" works in there.

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "node",
      "args": [
        "/path/to/perplexity-server/build/index.js",
        "--api-key",
        "your_api_key_here"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**Read an explicit `.env` File**: specify the location of the project `.env` file with the environment variables and API keys for your current project with the `--cwd` command-line argument, and the MCP Server will read the `.env` file from the directory finding the Perplexity API Key from there.

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "node",
      "args": [
        "/path/to/perplexity-server/build/index.js",
        "--cwd",
        "/path/to/your/project"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```
**Priority Order**: Command-line argument > Environment variable > .env file with `--cwd` (path needed)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=DaInfernalCoder/perplexity-mcp&type=Timeline)](https://www.star-history.com/#DaInfernalCoder/perplexity-mcp&Timeline)

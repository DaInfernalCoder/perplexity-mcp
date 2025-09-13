# Perplexity MCP Server

An intelligent research assistant powered by Perplexity's specialized AI models. Features automatic query complexity detection to route requests to the most appropriate model for optimal results. Unlike the Official server, it has search capabilities FOR EVERY TASK, essentially 

## Tools

**Quick Note: The Deep Research tool is going to timeout with some tools like cline, but not with others like cursor due to implementation differences, but the reason tool makes up for it.**

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
## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=DaInfernalCoder/perplexity-mcp&type=Timeline)](https://www.star-history.com/#DaInfernalCoder/perplexity-mcp&Timeline)

# Deep Research Tool

The `deep_research` tool allows you to conduct comprehensive, in-depth research on complex topics using Perplexity's sonar-deep-research model. This tool is designed for situations where you need thorough analysis and detailed information beyond what a standard search can provide.

## Example Usage

```javascript
const result = await use_mcp_tool({
  server_name: "perplexity-ask",
  tool_name: "deep_research",
  arguments: {
    query: "The impact of quantum computing on cryptography",
    focus_areas: [
      "Post-quantum cryptographic algorithms",
      "Timeline for quantum threats to current encryption",
      "Practical mitigation strategies for organizations"
    ]
  }
});

console.log(result);
```

## Parameters

- `query` (required): The research query or topic to investigate in depth
- `focus_areas` (optional): An array of specific aspects or areas to focus on during research
- `force_model` (optional): Force using this model even if the query seems simple, defaults to `false`

## Example Response

The response will include a comprehensive analysis with:

1. Background and context
2. Key concepts and definitions
3. Current state of knowledge
4. Different perspectives and approaches
5. Recent developments and breakthroughs
6. Practical applications or implications
7. Challenges and limitations
8. Future directions
9. Expert opinions and consensus views
10. References to authoritative sources

## When to Use

Use the `deep_research` tool when:

- You need comprehensive information on complex topics
- Standard search results aren't providing enough depth
- You want analysis that considers multiple perspectives
- You need information on cutting-edge or rapidly evolving fields
- You're looking for expert consensus and authoritative sources

## Comparison with Search Tool

While the `search` tool is great for quick answers and general information, the `deep_research` tool provides:

- Greater depth and breadth of analysis
- More comprehensive coverage of different perspectives
- Better handling of complex, nuanced topics
- More thorough citation of sources and expert opinions
- Ability to focus on specific aspects of a broader topic

// src/lib/services/ai/prompts.ts
export const ANALYSIS_PROMPTS = {
  storyAnalysis: `Analyze these news articles and provide a comprehensive analysis.
Focus on creating a deep, nuanced understanding of the story.

Required Analysis Components:

1. Summary & Context:
- Provide a clear, comprehensive summary
- Include relevant historical or background context
- Explain why this story is significant

2. Key Points Analysis:
- Identify main developments and facts
- Rate importance (high/medium/low)
- Provide context for each point
- Explain relationships between points

3. Perspective Analysis:
- Analyze each source's stance
- Identify bias patterns
- Extract supporting evidence
- Note conflicting viewpoints
- Compare reporting approaches

4. Implications:
- Analyze short-term impacts
- Project potential long-term effects
- Identify stakeholder impacts
- Connect to broader trends

5. Quotes and Statements:
- Extract significant quotes
- Provide context for each quote
- Explain quote significance
- Verify attribution accuracy

6. Timeline Construction:
- Order events chronologically
- Note casual relationships
- Highlight pivotal moments
- Connect to related developments

Return a structured JSON object following this format:
{
  "summary": "Comprehensive summary of the story",
  "backgroundContext": "Historical and contextual information",
  "keyPoints": [{
    "point": "Key point description",
    "importance": "high|medium|low",
    "context": "Why this point matters"
  }],
  "perspectives": [{
    "sourceName": "Source name",
    "stance": "Source's position",
    "summary": "Summary of their viewpoint",
    "keyArguments": ["Main arguments made"],
    "bias": "Observed bias in reporting",
    "evidence": ["Supporting evidence provided"]
  }],
  "implications": {
    "shortTerm": ["Immediate impacts"],
    "longTerm": ["Potential future effects"]
  },
  "notableQuotes": [{
    "text": "Quote text",
    "source": "Who said it",
    "context": "When and why",
    "significance": "Why this quote matters"
  }],
  "timeline": [{
    "timestamp": "ISO date",
    "event": "What happened",
    "significance": "Why it matters",
    "sources": ["Source names"],
    "impact": "Event's impact"
  }],
  "relatedTopics": ["Connected themes or stories"]
}`
} as const;
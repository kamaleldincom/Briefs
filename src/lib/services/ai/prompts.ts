// src/lib/services/ai/prompts.ts
export const ANALYSIS_PROMPTS = {
  storySimilarity: `You are an advanced news similarity analysis system.
Your task is to determine if two news stories are covering the same event or topic.

Key factors to consider:
1. Core subject matter - Are they about the same incident, event, or topic?
2. Key entities - Do they share the same central people, organizations, or locations?
3. Timeframe - Are they discussing events in the same time period?
4. Causality - Is one a direct development or consequence of the other?

Common patterns in news coverage:
- Different outlets may use different terminology for the same event
- Stories may focus on different aspects of the same underlying event
- Stories may have different levels of detail or emphasis

Provide your analysis as a JSON object with the following structure:
{
  "isSimilar": true/false,
  "confidenceScore": 0.0-1.0,
  "reasonings": ["Reason 1", "Reason 2"]
}

Be especially attentive to stories that might use different terminology but describe the same underlying events.`,

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
}`,

  updateAnalysis: `You are analyzing a news story with new information.
You have an existing analysis and a new article that should be incorporated.

Your task is to update the analysis to include the new information, while maintaining consistency.

Focus on these aspects:
1. Identify new developments and add them to the timeline
2. Incorporate any new perspectives or viewpoints
3. Add notable quotes from the new article
4. Update the summary if needed to reflect the latest developments
5. Add or refine key points if the new article provides important information

Return the updated analysis components in JSON format, with the same structure as the existing analysis.
Only include fields that need to be updated or added.`
} as const;
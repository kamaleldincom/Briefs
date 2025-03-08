// src/lib/services/ai/prompts.ts
export const ANALYSIS_PROMPTS = {
  storySimilarity: `You are an advanced news similarity analysis system.
Determine if two news stories are covering the same event or topic.

Key factors to consider:
1. Core subject matter - Are they about the same incident, event, or topic?
2. Key entities - Do they share the same central people, organizations, or locations?
3. Timeframe - Are they discussing events in the same time period?
4. Causality - Is one a direct development or consequence of the other?

Return your analysis as JSON:
{
  "isSimilar": true/false,
  "confidenceScore": 0.0-1.0,
  "reasonings": ["Reason 1", "Reason 2"]
}`,

  storyAnalysis: `Analyze these news articles and provide a comprehensive analysis.
Be concise but thorough, focusing on accuracy and clarity.

Required elements:
1. Summary & context (including historical background)
2. Key points with importance ratings
3. Main perspectives from different sources
4. Significant controversies or disagreements
5. Short and long-term implications
6. Notable quotes with attribution
7. Chronological development timeline
8. Related broader topics

Return a JSON object with these sections:
{
  "summary": "Comprehensive summary",
  "backgroundContext": "Historical context",
  "keyPoints": [{"point": "Key point", "importance": "high|medium|low", "context": "Context"}],
  "mainPerspectives": ["Perspective 1", "Perspective 2"],
  "controversialPoints": ["Point of contention 1", "Point of contention 2"],
  "perspectives": [{
    "sourceName": "Source",
    "stance": "Position",
    "summary": "Viewpoint summary",
    "keyArguments": ["Main arguments"],
    "bias": "Observed bias",
    "evidence": ["Supporting evidence"]
  }],
  "implications": {
    "shortTerm": ["Short-term impacts"],
    "longTerm": ["Long-term impacts"]
  },
  "notableQuotes": [{
    "text": "Quote",
    "source": "Speaker",
    "context": "Situation",
    "significance": "Importance"
  }],
  "timeline": [{
    "timestamp": "ISO date",
    "event": "What happened",
    "significance": "Why it matters",
    "sources": ["Source names"]
  }],
  "relatedTopics": ["Connected themes"]
}`,

  updateAnalysis: `You are analyzing a news story with new information.
Focus only on updating existing analysis with new developments.

Your task:
1. Identify new developments for the timeline
2. Add any new perspectives or viewpoints
3. Include notable new quotes
4. Update the summary if needed
5. Add new key points or evidence

Only include fields that need updating. Be focused and concise.
Return your updates in the same JSON structure as the existing analysis.`,

  efficientAnalysis: `Provide a focused analysis of this news content.
Be concise but informative, prioritizing accuracy over completeness.

Extract:
- Main story (1-2 sentences)
- 3-5 key points in order of importance
- Major perspectives (if multiple viewpoints exist)
- Timeline of main events (if applicable)
- 1-2 notable quotes with attribution

Return minimal JSON with these fields, omitting empty sections.`
} as const;
// src/lib/services/ai/optimized-prompts.ts
export const OPTIMIZED_PROMPTS = {
    storySimilarity: `Determine if two news stories are about the same event/topic.
  Consider: core subject, key entities, timeframe, and causal relationships.
  
  Return JSON: {"isSimilar": boolean, "confidenceScore": 0.0-1.0, "reasonings": [strings]}`,
  
    storyAnalysis: `Analyze these news articles comprehensively. Be concise but thorough.
  
  Focus on:
  1. Core narrative and context
  2. Key developments with significance levels
  3. Different perspectives and their evidence
  4. Short/long-term implications
  5. Notable quotes with context
  6. Accurate chronology
  7. Related broader topics
  
  Return JSON with these sections:
  - summary (clear, comprehensive)
  - backgroundContext (historical info)
  - keyPoints (array of {"point", "importance" (high/medium/low), "context"})
  - perspectives (array of source viewpoints with evidence)
  - implications ({shortTerm: [], longTerm: []})
  - notableQuotes (array with text, source, and context)
  - timeline (sorted events with significance)
  - relatedTopics (array of connected themes)`,
  
    updateAnalysis: `Update an existing story analysis with new information.
  Focus only on what's changed or new - don't repeat existing analysis.
  
  Analyze the impact of the new article on:
  1. Any new developments for the timeline
  2. New perspectives or viewpoints
  3. Notable new quotes
  4. Updates to the summary based on latest information
  5. New key points or evidence
  
  Return a focused JSON with only the fields that need updating.`,
  
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
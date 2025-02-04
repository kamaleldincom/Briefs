// src/lib/services/ai/prompts.ts
export const ANALYSIS_PROMPTS = {
  storySimilarity: `Analyze if these news stories are about the same event or closely related events.

Consider:
1. Core topic/event alignment
2. Key participants and entities
3. Timeline proximity
4. Geographic location
5. Cause-effect relationships
6. Context and implications

Stories should be considered similar if they:
- Cover the same primary event
- Describe different aspects of the same ongoing story
- Report on closely related developments of a single situation
- Share key participants and core narrative elements

Provide a similarity score where:
- 1.0: Identical stories
- 0.8+: Same event, different perspectives
- 0.6-0.8: Closely related developments
- <0.6: Different stories

Return a JSON object with:
{
  "isSimilar": boolean,
  "confidenceScore": number (0-1),
  "reasonings": [
    "Specific reasons for similarity/difference"
  ]
}`,

  storyAnalysis: `Analyze these related news articles and provide a comprehensive analysis.
Return a structured JSON object following this format:
{
  "summary": "Clear, concise summary of the overall story",
  "keyPoints": [
    "Specific key points..."
  ],
  "mainPerspectives": [
    "Main viewpoints from different sources..."
  ],
  "controversialPoints": [
    "Areas of disagreement or contention..."
  ],
  "perspectives": [
    {
      "sourceName": "Source name",
      "viewpoint": "Detailed perspective",
      "bias": "Observed bias",
      "evidence": "Supporting evidence"
    }
  ],
  "notableQuotes": [
    {
      "text": "Exact quote",
      "source": "Who said it",
      "context": "When and why",
      "significance": "Why it matters"
    }
  ],
  "timeline": [
    {
      "timestamp": "ISO date string",
      "event": "What happened",
      "significance": "Why this matters",
      "sources": ["Source names"]
    }
  ]
}`
} as const;
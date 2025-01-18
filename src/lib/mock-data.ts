// src/lib/mock-data.ts
import { Story } from './types';

export const MOCK_STORIES: Story[] = [
  {
    id: '1',
    title: 'Major Tech Company Announces Revolutionary AI Model',
    summary: 'A leading tech company has unveiled a groundbreaking AI model that promises to transform multiple industries, sparking discussions about AI safety and ethics.',
    content: 'Full content here...',
    sources: [
      {
        id: 'tech-news',
        name: 'Tech News',
        url: 'https://technews.com',
        bias: 0,
        sentiment: 0.2,
        excerpt: 'The new AI model demonstrates unprecedented capabilities in understanding and generating human-like responses.'
      },
      {
        id: 'ai-daily',
        name: 'AI Daily',
        url: 'https://aidaily.com',
        bias: 0.1,
        sentiment: 0.4,
        excerpt: 'This breakthrough could represent a significant step forward in artificial general intelligence.'
      },
      {
        id: 'tech-critical',
        name: 'Tech Critical',
        url: 'https://techcritical.com',
        bias: -0.2,
        sentiment: -0.3,
        excerpt: 'Concerns about safety protocols and ethical implications remain inadequately addressed.'
      }
    ],
    metadata: {
      firstPublished: new Date('2024-12-24T09:00:00Z'),
      lastUpdated: new Date('2024-12-24T15:30:00Z'),
      totalSources: 3,
      categories: ['Technology', 'AI', 'Ethics']
    },
    analysis: {
      summary: 'A major technological breakthrough in AI development with significant implications for various industries, balanced against ethical concerns and safety considerations.',
      keyPoints: [
        'New AI model demonstrates advanced language understanding capabilities',
        'Potential applications span multiple industries including healthcare and education',
        'Raises concerns about AI safety and ethical implications',
        'Company claims robust safety measures are in place'
      ],
      mainPerspectives: [
        'The technology represents a significant advancement in AI capabilities',
        'Safety protocols may be insufficient for the level of AI advancement',
        'The development could democratize access to advanced AI tools'
      ],
      controversialPoints: [
        'Adequacy of safety measures',
        'Potential impact on employment',
        'Data privacy concerns'
      ],
      timeline: [
        {
          timestamp: new Date('2024-12-24T09:00:00Z'),
          event: 'Initial announcement',
          sources: ['Tech News']
        },
        {
          timestamp: new Date('2024-12-24T11:30:00Z'),
          event: 'Technical details released',
          sources: ['AI Daily']
        },
        {
          timestamp: new Date('2024-12-24T14:00:00Z'),
          event: 'Expert analysis and concerns published',
          sources: ['Tech Critical']
        }
      ]
    }
  },
  {
    id: '2',
    title: 'Global Climate Summit Reaches Historic Agreement',
    summary: 'World leaders have reached a landmark agreement on climate change, setting ambitious targets for emissions reduction and renewable energy adoption.',
    content: 'Full content here...',
    sources: [
      {
        id: 'global-news',
        name: 'Global News',
        url: 'https://globalnews.com',
        bias: -0.1,
        sentiment: 0.3,
        excerpt: 'The agreement represents the most ambitious climate action plan to date.'
      },
      {
        id: 'climate-watch',
        name: 'Climate Watch',
        url: 'https://climatewatch.org',
        bias: -0.2,
        sentiment: 0.1,
        excerpt: 'While promising, the targets may still fall short of whats needed to prevent catastrophic warming.'
      },
      {
        id: 'industry-today',
        name: 'Industry Today',
        url: 'https://industrytoday.com',
        bias: 0.4,
        sentiment: -0.2,
        excerpt: 'Implementation challenges and economic impacts remain significant concerns.'
      }
    ],
    metadata: {
      firstPublished: new Date('2024-12-23T18:00:00Z'),
      lastUpdated: new Date('2024-12-24T12:00:00Z'),
      totalSources: 3,
      categories: ['Environment', 'Politics', 'Economy']
    },
    analysis: {
      summary: 'A historic climate agreement that sets ambitious targets while facing implementation challenges and economic considerations.',
      keyPoints: [
        'Agreement sets new global emissions reduction targets',
        'Includes significant funding for renewable energy',
        'Establishes monitoring mechanisms',
        'Addresses developing nations concerns'
      ],
      mainPerspectives: [
        'Agreement represents historic progress in climate action',
        'Targets may be insufficient for climate crisis',
        'Economic implications need careful consideration'
      ],
      controversialPoints: [
        'Sufficiency of targets',
        'Economic impact on developing nations',
        'Implementation timeline feasibility'
      ],
      timeline: [
        {
          timestamp: new Date('2024-12-23T18:00:00Z'),
          event: 'Agreement reached',
          sources: ['Global News']
        },
        {
          timestamp: new Date('2024-12-24T09:00:00Z'),
          event: 'Scientific analysis released',
          sources: ['Climate Watch']
        },
        {
          timestamp: new Date('2024-12-24T11:00:00Z'),
          event: 'Industry response published',
          sources: ['Industry Today']
        }
      ]
    }
  }
];
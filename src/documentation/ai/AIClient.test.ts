import { AIClient, AIConfig } from './AIClient';

describe('AIClient', () => {
  let aiClient: AIClient;

  beforeEach(() => {
    aiClient = new AIClient();
  });

  describe('initialization', () => {
    it('should create an instance', () => {
      expect(aiClient).toBeInstanceOf(AIClient);
    });
  });

  describe('generateCompletionWithRetry', () => {
    it('should throw error when no API keys are configured', async () => {
      const config: AIConfig = {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      };

      // Only test if no API keys are set
      if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        await expect(
          aiClient.generateCompletionWithRetry('test prompt', 'test system', config, 1)
        ).rejects.toThrow();
      }
    });
  });
});

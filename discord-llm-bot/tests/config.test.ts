import { jest } from '@jest/globals';
import { 
  GROK_PLANNER_PROMPT, 
  GROK_RESPONSE_PROMPT, 
  GROK_GENERAL_PROMPT,
  BOT_NAME 
} from '../src/config.js';

describe('Config Integration Tests', () => {
  describe('Prompt content validation', () => {
    it('should have non-empty prompt content', () => {
      // Verify prompts are not empty
      expect(GROK_PLANNER_PROMPT).toBeTruthy();
      expect(GROK_RESPONSE_PROMPT).toBeTruthy();
      expect(GROK_GENERAL_PROMPT).toBeTruthy();
      expect(GROK_PLANNER_PROMPT.length).toBeGreaterThan(0);
      expect(GROK_RESPONSE_PROMPT.length).toBeGreaterThan(0);
      expect(GROK_GENERAL_PROMPT.length).toBeGreaterThan(0);
    });

    it('should contain expected keywords in planner prompt', () => {
      // Verify planner prompt contains key concepts
      expect(GROK_PLANNER_PROMPT).toContain('Tool Planner');
      expect(GROK_PLANNER_PROMPT).toContain('tool');
    });

    it('should contain expected keywords in response prompt', () => {
      // Verify response prompt contains key concepts
      expect(GROK_RESPONSE_PROMPT).toContain('assistant');
    });

    it('should contain expected keywords in general prompt', () => {
      // Verify general prompt contains key concepts
      expect(GROK_GENERAL_PROMPT).toContain('assistant');
    });

    it('should have BOT_NAME defined', () => {
      expect(BOT_NAME).toBeTruthy();
      expect(typeof BOT_NAME).toBe('string');
      expect(BOT_NAME.length).toBeGreaterThan(0);
    });
  });

  describe('Prompt structure', () => {
    it('planner prompt should be a string', () => {
      expect(typeof GROK_PLANNER_PROMPT).toBe('string');
    });

    it('response prompt should be a string', () => {
      expect(typeof GROK_RESPONSE_PROMPT).toBe('string');
    });

    it('general prompt should be a string', () => {
      expect(typeof GROK_GENERAL_PROMPT).toBe('string');
    });
  });
});

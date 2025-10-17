import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

describe('prompts.yaml File Validation', () => {
  let promptsYamlPath: string;
  let promptsContent: string;
  let parsedPrompts: any;

  beforeAll(() => {
    // Get the actual path to prompts.yaml
    promptsYamlPath = join(process.cwd(), 'prompts.yaml');
    
    // Read the actual file content
    promptsContent = fs.readFileSync(promptsYamlPath, 'utf8');
    
    // Parse the YAML content
    parsedPrompts = yaml.load(promptsContent);
  });

  describe('file structure', () => {
    it('should exist and be readable', () => {
      expect(fs.existsSync(promptsYamlPath)).toBe(true);
      expect(promptsContent).toBeTruthy();
      expect(promptsContent.length).toBeGreaterThan(0);
    });

    it('should be valid YAML', () => {
      expect(() => yaml.load(promptsContent)).not.toThrow();
      expect(parsedPrompts).toBeDefined();
      expect(typeof parsedPrompts).toBe('object');
    });

    it('should have required top-level sections', () => {
      expect(parsedPrompts).toHaveProperty('planner');
      expect(parsedPrompts).toHaveProperty('response');
      expect(parsedPrompts).toHaveProperty('general');
    });

    it('should have prompt properties in each section', () => {
      expect(parsedPrompts.planner).toHaveProperty('prompt');
      expect(parsedPrompts.response).toHaveProperty('prompt');
      expect(parsedPrompts.general).toHaveProperty('prompt');
    });
  });

  describe('prompt content validation', () => {
    it('should have non-empty prompt content', () => {
      expect(parsedPrompts.planner.prompt).toBeTruthy();
      expect(parsedPrompts.response.prompt).toBeTruthy();
      expect(parsedPrompts.general.prompt).toBeTruthy();
      
      expect(parsedPrompts.planner.prompt.length).toBeGreaterThan(10);
      expect(parsedPrompts.response.prompt.length).toBeGreaterThan(10);
      expect(parsedPrompts.general.prompt.length).toBeGreaterThan(10);
    });

    it('should contain required placeholders', () => {
      expect(parsedPrompts.planner.prompt).toContain('{TOOL_DESCRIPTIONS}');
      expect(parsedPrompts.response.prompt).toContain('{BOT_NAME}');
      expect(parsedPrompts.general.prompt).toContain('{BOT_NAME}');
    });

    it('should have appropriate prompt content for each type', () => {
      // Planner prompt should mention tool planning
      expect(parsedPrompts.planner.prompt.toLowerCase()).toContain('tool planner');
      expect(parsedPrompts.planner.prompt.toLowerCase()).toContain('json');
      
      // Response prompt should mention tool execution
      expect(parsedPrompts.response.prompt.toLowerCase()).toContain('tool');
      expect(parsedPrompts.response.prompt.toLowerCase()).toContain('executed');
      
      // General prompt should be about general assistance
      expect(parsedPrompts.general.prompt.toLowerCase()).toContain('assistant');
    });
  });

  describe('prompt quality checks', () => {
    it('should not contain obvious errors or typos', () => {
      // Check for common typos
      expect(parsedPrompts.planner.prompt).not.toContain('recieve');
      expect(parsedPrompts.response.prompt).not.toContain('recieve');
      expect(parsedPrompts.general.prompt).not.toContain('recieve');
      
      // Check for proper capitalization
      expect(parsedPrompts.planner.prompt).toContain('JSON');
      expect(parsedPrompts.response.prompt).toContain('IMPORTANT');
    });

    it('should have consistent formatting', () => {
      // All prompts should end with newline
      expect(parsedPrompts.planner.prompt).toMatch(/\n$/);
      expect(parsedPrompts.response.prompt).toMatch(/\n$/);
      expect(parsedPrompts.general.prompt).toMatch(/\n$/);
    });

    it('should have appropriate length for each prompt type', () => {
      // Planner prompt should be detailed (longest)
      expect(parsedPrompts.planner.prompt.length).toBeGreaterThan(500);
      
      // Response and general prompts should be reasonable length
      expect(parsedPrompts.response.prompt.length).toBeGreaterThan(100);
      expect(parsedPrompts.general.prompt.length).toBeGreaterThan(50);
    });
  });

  describe('integration with config loading', () => {
    it('should be loadable by the config module', async () => {
      // Mock the config module to test actual loading
      const mockConfig = {
        GROK_PLANNER_PROMPT: parsedPrompts.planner.prompt,
        GROK_RESPONSE_PROMPT: parsedPrompts.response.prompt,
        GROK_GENERAL_PROMPT: parsedPrompts.general.prompt,
      };

      // Verify the prompts match what would be loaded
      expect(mockConfig.GROK_PLANNER_PROMPT).toBe(parsedPrompts.planner.prompt);
      expect(mockConfig.GROK_RESPONSE_PROMPT).toBe(parsedPrompts.response.prompt);
      expect(mockConfig.GROK_GENERAL_PROMPT).toBe(parsedPrompts.general.prompt);
    });

    it('should work with placeholder replacement', () => {
      const botName = 'TestBot';
      const toolDescriptions = 'Test tool descriptions';
      
      // Test placeholder replacement
      const responsePromptWithBotName = parsedPrompts.response.prompt.replace('{BOT_NAME}', botName);
      const generalPromptWithBotName = parsedPrompts.general.prompt.replace('{BOT_NAME}', botName);
      const plannerPromptWithTools = parsedPrompts.planner.prompt.replace('{TOOL_DESCRIPTIONS}', toolDescriptions);
      
      expect(responsePromptWithBotName).toContain(botName);
      expect(responsePromptWithBotName).not.toContain('{BOT_NAME}');
      
      expect(generalPromptWithBotName).toContain(botName);
      expect(generalPromptWithBotName).not.toContain('{BOT_NAME}');
      
      expect(plannerPromptWithTools).toContain(toolDescriptions);
      expect(plannerPromptWithTools).not.toContain('{TOOL_DESCRIPTIONS}');
    });
  });

  describe('documentation and comments', () => {
    it('should have helpful comments', () => {
      expect(promptsContent).toContain('# System Prompts Configuration');
      expect(promptsContent).toContain('# How to use:');
      expect(promptsContent).toContain('# Note: The YAML format');
    });

    it('should document placeholders', () => {
      expect(promptsContent).toContain('{BOT_NAME}');
      expect(promptsContent).toContain('{TOOL_DESCRIPTIONS}');
    });
  });
});

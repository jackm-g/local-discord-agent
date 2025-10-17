import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Mock fs and yaml modules
jest.mock('fs');
jest.mock('js-yaml');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedYaml = yaml as jest.Mocked<typeof yaml>;

describe('Config YAML Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module cache to ensure fresh imports
    jest.resetModules();
  });

  describe('prompts.yaml loading', () => {
    it('should successfully load prompts from YAML file', async () => {
      // Mock YAML content
      const mockYamlContent = `
planner:
  prompt: |
    You are the Tool Planner for a Discord bot.
    Available tools: {TOOL_DESCRIPTIONS}
    Return ONLY a compact JSON object.

response:
  prompt: |
    You are a knowledgeable AI assistant named '{BOT_NAME}'.
    A tool was just executed.

general:
  prompt: |
    You are a knowledgeable AI assistant named '{BOT_NAME}'.
`;

      const mockParsedYaml = {
        planner: {
          prompt: 'You are the Tool Planner for a Discord bot.\nAvailable tools: {TOOL_DESCRIPTIONS}\nReturn ONLY a compact JSON object.\n'
        },
        response: {
          prompt: 'You are a knowledgeable AI assistant named \'{BOT_NAME}\'.\nA tool was just executed.\n'
        },
        general: {
          prompt: 'You are a knowledgeable AI assistant named \'{BOT_NAME}\'.\n'
        }
      };

      // Mock file system operations
      mockedFs.readFileSync.mockReturnValue(mockYamlContent);
      mockedYaml.load.mockReturnValue(mockParsedYaml);

      // Mock file path resolution
      const mockDirname = '/mock/path/dist';
      jest.doMock('url', () => ({
        fileURLToPath: jest.fn(() => '/mock/path/dist/config.js')
      }));

      // Import config after mocking
      const config = await import('../src/config');

      // Verify the prompts are loaded correctly
      expect(config.GROK_PLANNER_PROMPT).toBe(mockParsedYaml.planner.prompt);
      expect(config.GROK_RESPONSE_PROMPT).toBe(mockParsedYaml.response.prompt);
      expect(config.GROK_GENERAL_PROMPT).toBe(mockParsedYaml.general.prompt);

      // Verify file operations were called correctly
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('prompts.yaml'),
        'utf8'
      );
      expect(mockedYaml.load).toHaveBeenCalledWith(mockYamlContent);
    });

    it('should use fallback prompts when YAML file is missing', async () => {
      // Mock file system error
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      // Mock file path resolution
      jest.doMock('url', () => ({
        fileURLToPath: jest.fn(() => '/mock/path/dist/config.js')
      }));

      // Import config after mocking
      const config = await import('../src/config');

      // Verify fallback prompts are used
      expect(config.GROK_PLANNER_PROMPT).toContain('Tool Planner for a Discord bot');
      expect(config.GROK_RESPONSE_PROMPT).toContain('knowledgeable AI assistant');
      expect(config.GROK_GENERAL_PROMPT).toContain('knowledgeable AI assistant');

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load prompts.yaml:',
        expect.any(Error)
      );
    });

    it('should use fallback prompts when YAML parsing fails', async () => {
      // Mock file system success but YAML parsing failure
      mockedFs.readFileSync.mockReturnValue('invalid yaml content');
      mockedYaml.load.mockImplementation(() => {
        throw new Error('YAML parsing error');
      });

      // Mock file path resolution
      jest.doMock('url', () => ({
        fileURLToPath: jest.fn(() => '/mock/path/dist/config.js')
      }));

      // Import config after mocking
      const config = await import('../src/config');

      // Verify fallback prompts are used
      expect(config.GROK_PLANNER_PROMPT).toContain('Tool Planner for a Discord bot');
      expect(config.GROK_RESPONSE_PROMPT).toContain('knowledgeable AI assistant');
      expect(config.GROK_GENERAL_PROMPT).toContain('knowledgeable AI assistant');

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load prompts.yaml:',
        expect.any(Error)
      );
    });

    it('should resolve correct file path from dist directory', async () => {
      // Mock file system operations
      mockedFs.readFileSync.mockReturnValue('test content');
      mockedYaml.load.mockReturnValue({ planner: { prompt: 'test' }, response: { prompt: 'test' }, general: { prompt: 'test' } });

      // Mock file path resolution to simulate running from dist/config.js
      jest.doMock('url', () => ({
        fileURLToPath: jest.fn(() => '/mock/path/dist/config.js')
      }));

      // Import config after mocking
      await import('../src/config');

      // Verify the correct path was used
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/prompts\.yaml$/),
        'utf8'
      );
    });
  });

  describe('prompt content validation', () => {
    it('should contain required placeholders in prompts', async () => {
      // Mock YAML content with placeholders
      const mockYamlContent = `
planner:
  prompt: |
    Tool Planner prompt with {TOOL_DESCRIPTIONS} placeholder.

response:
  prompt: |
    Response prompt with {BOT_NAME} placeholder.

general:
  prompt: |
    General prompt with {BOT_NAME} placeholder.
`;

      const mockParsedYaml = {
        planner: { prompt: 'Tool Planner prompt with {TOOL_DESCRIPTIONS} placeholder.\n' },
        response: { prompt: 'Response prompt with {BOT_NAME} placeholder.\n' },
        general: { prompt: 'General prompt with {BOT_NAME} placeholder.\n' }
      };

      mockedFs.readFileSync.mockReturnValue(mockYamlContent);
      mockedYaml.load.mockReturnValue(mockParsedYaml);

      jest.doMock('url', () => ({
        fileURLToPath: jest.fn(() => '/mock/path/dist/config.js')
      }));

      const config = await import('../src/config');

      // Verify placeholders are present
      expect(config.GROK_PLANNER_PROMPT).toContain('{TOOL_DESCRIPTIONS}');
      expect(config.GROK_RESPONSE_PROMPT).toContain('{BOT_NAME}');
      expect(config.GROK_GENERAL_PROMPT).toContain('{BOT_NAME}');
    });

    it('should have non-empty prompt content', async () => {
      const mockParsedYaml = {
        planner: { prompt: 'Valid planner prompt' },
        response: { prompt: 'Valid response prompt' },
        general: { prompt: 'Valid general prompt' }
      };

      mockedFs.readFileSync.mockReturnValue('test content');
      mockedYaml.load.mockReturnValue(mockParsedYaml);

      jest.doMock('url', () => ({
        fileURLToPath: jest.fn(() => '/mock/path/dist/config.js')
      }));

      const config = await import('../src/config');

      // Verify prompts are not empty
      expect(config.GROK_PLANNER_PROMPT).toBeTruthy();
      expect(config.GROK_RESPONSE_PROMPT).toBeTruthy();
      expect(config.GROK_GENERAL_PROMPT).toBeTruthy();
      expect(config.GROK_PLANNER_PROMPT.length).toBeGreaterThan(0);
      expect(config.GROK_RESPONSE_PROMPT.length).toBeGreaterThan(0);
      expect(config.GROK_GENERAL_PROMPT.length).toBeGreaterThan(0);
    });
  });
});

import { jest } from '@jest/globals';
import axios from 'axios';
import { GrokPlanner } from '../src/llm/grok.js';

// Mock axios
jest.mock('axios');

describe('GrokPlanner Prompt Usage', () => {
  let grokPlanner: GrokPlanner;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
    };
    
    (axios.create as any) = jest.fn().mockReturnValue(mockAxiosInstance);
    
    // Create GrokPlanner instance
    grokPlanner = new GrokPlanner();
  });

  describe('planTool method', () => {
    it('should use GROK_PLANNER_PROMPT with tool descriptions', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: '{"useTool": false, "reason": "test"}'
            }
          }]
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const userMessage = 'test message';
      const conversationHistory = 'previous conversation';
      const toolDescriptions = 'test tool descriptions';

      await grokPlanner.planTool(userMessage, conversationHistory, toolDescriptions);

      // Verify axios was called with correct parameters
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Tool Planner for a Discord bot')
            })
          ])
        })
      );

      // Verify the system prompt contains tool descriptions
      const callArgs = mockAxiosInstance.post.mock.calls[0][1];
      const systemMessage = callArgs.messages.find((msg: any) => msg.role === 'system');
      expect(systemMessage.content).toContain(toolDescriptions);
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      const result = await grokPlanner.planTool('test', 'history', 'tools');

      expect(result).toEqual({
        useTool: false,
        reason: 'Error communicating with planning system'
      });
    });
  });

  describe('finalizeResponse method', () => {
    it('should use GROK_RESPONSE_PROMPT with bot name replacement', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Test response'
            }
          }]
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const userMessage = 'test message';
      const toolResult = 'tool executed successfully';
      const conversationHistory = 'previous conversation';

      await grokPlanner.finalizeResponse(userMessage, toolResult, conversationHistory);

      // Verify axios was called with correct parameters
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('knowledgeable AI assistant')
            })
          ])
        })
      );

      // Verify the system prompt contains bot name placeholder replacement
      const callArgs = mockAxiosInstance.post.mock.calls[0][1];
      const systemMessage = callArgs.messages.find((msg: any) => msg.role === 'system');
      expect(systemMessage.content).toContain('TestBot'); // From setup.ts
    });

    it('should include tool result in user message', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Test response'
            }
          }]
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const userMessage = 'test message';
      const toolResult = 'specific tool result';
      const conversationHistory = 'previous conversation';

      await grokPlanner.finalizeResponse(userMessage, toolResult, conversationHistory);

      // Verify tool result is included in user message
      const callArgs = mockAxiosInstance.post.mock.calls[0][1];
      const userMessageContent = callArgs.messages.find((msg: any) => msg.role === 'user').content;
      expect(userMessageContent).toContain(toolResult);
    });
  });

  describe('generateResponse method', () => {
    it('should use GROK_GENERAL_PROMPT with bot name replacement', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'General response'
            }
          }]
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const userMessage = 'test message';
      const conversationHistory = 'previous conversation';

      await grokPlanner.generateResponse(userMessage, conversationHistory);

      // Verify axios was called with correct parameters
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('knowledgeable AI assistant')
            })
          ])
        })
      );

      // Verify the system prompt contains bot name placeholder replacement
      const callArgs = mockAxiosInstance.post.mock.calls[0][1];
      const systemMessage = callArgs.messages.find((msg: any) => msg.role === 'system');
      expect(systemMessage.content).toContain('TestBot'); // From setup.ts
    });

    it('should handle API errors by throwing', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      await expect(
        grokPlanner.generateResponse('test', 'history')
      ).rejects.toThrow('API Error');
    });
  });

  describe('prompt placeholder replacement', () => {
    it('should replace {BOT_NAME} placeholder in response prompt', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Test response'
            }
          }]
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await grokPlanner.finalizeResponse('test', 'result', 'history');

      const callArgs = mockAxiosInstance.post.mock.calls[0][1];
      const systemMessage = callArgs.messages.find((msg: any) => msg.role === 'system');
      
      // Should not contain the placeholder anymore
      expect(systemMessage.content).not.toContain('{BOT_NAME}');
      // Should contain the actual bot name
      expect(systemMessage.content).toContain('TestBot');
    });

    it('should replace {BOT_NAME} placeholder in general prompt', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'General response'
            }
          }]
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await grokPlanner.generateResponse('test', 'history');

      const callArgs = mockAxiosInstance.post.mock.calls[0][1];
      const systemMessage = callArgs.messages.find((msg: any) => msg.role === 'system');
      
      // Should not contain the placeholder anymore
      expect(systemMessage.content).not.toContain('{BOT_NAME}');
      // Should contain the actual bot name
      expect(systemMessage.content).toContain('TestBot');
    });

    it('should replace {TOOL_DESCRIPTIONS} placeholder in planner prompt', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: '{"useTool": false, "reason": "test"}'
            }
          }]
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const toolDescriptions = 'specific tool descriptions for testing';
      await grokPlanner.planTool('test', 'history', toolDescriptions);

      const callArgs = mockAxiosInstance.post.mock.calls[0][1];
      const systemMessage = callArgs.messages.find((msg: any) => msg.role === 'system');
      
      // Should not contain the placeholder anymore
      expect(systemMessage.content).not.toContain('{TOOL_DESCRIPTIONS}');
      // Should contain the actual tool descriptions
      expect(systemMessage.content).toContain(toolDescriptions);
    });
  });

  describe('API configuration', () => {
    it('should use correct API configuration', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        headers: {
          Authorization: expect.stringContaining('Bearer'),
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    });
  });
});

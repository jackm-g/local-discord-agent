// Test setup file
import { jest } from '@jest/globals';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN = 'test_token';
process.env.APP_ID = 'test_app_id';
process.env.GROK_API_KEY = 'test_grok_key';
process.env.MONGO_URI = 'test_mongo_uri';
process.env.PIXELLAB_API_KEY = 'test_pixellab_key';
process.env.BOT_NAME = 'TestBot';

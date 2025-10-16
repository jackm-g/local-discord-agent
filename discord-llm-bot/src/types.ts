/**
 * Type definitions for the Discord bot orchestrator
 */

export interface ToolPlan {
  useTool: boolean;
  tool?: string;
  args?: Record<string, any>;
  reason: string;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: any;
}

export interface ConversationHistory {
  channelId: string;
  messages: ConversationMessage[];
  lastUpdated: Date;
}

export interface CachedResult {
  key: string;
  result: any;
  timestamp: Date;
  expiresAt: Date;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  tools: string[]; // List of tool names this server provides
}

export interface ToolCallResult {
  success: boolean;
  content: string;
  imageUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
}


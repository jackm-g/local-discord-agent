/**
 * Grok LLM planner - handles JSON-based tool planning
 */
import axios, { AxiosInstance } from "axios";
import { ToolPlan } from "../types.js";
import { ToolPlanSchema } from "../validation/schemas.js";
import {
  GROK_API_KEY,
  GROK_MODEL,
  GROK_BASE_URL,
  GROK_TEMPERATURE,
  GROK_MAX_TOKENS,
  BOT_NAME,
} from "../config.js";

export class GrokPlanner {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: GROK_BASE_URL,
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  /**
   * Plan whether to use a tool and which one
   */
  async planTool(
    userMessage: string,
    conversationHistory: string,
    toolDescriptions: string
  ): Promise<ToolPlan> {
    const systemPrompt = this.buildPlannerPrompt(toolDescriptions);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Previous conversation:\n${conversationHistory}\n\nCurrent message: ${userMessage}` },
    ];

    try {
      const response = await this.client.post("/chat/completions", {
        model: GROK_MODEL,
        messages,
        temperature: GROK_TEMPERATURE,
        max_tokens: GROK_MAX_TOKENS,
      });

      const content = response.data.choices[0]?.message?.content || "";
      
      // Parse JSON response
      const parsed = this.parseToolPlan(content);
      return parsed;
    } catch (error) {
      console.error("Error calling Grok API:", error);
      
      // Return a fallback plan to respond without tools
      return {
        useTool: false,
        reason: "Error communicating with planning system",
      };
    }
  }

  /**
   * Generate a friendly response using Grok (after tool execution)
   */
  async finalizeResponse(
    userMessage: string,
    toolResult: string,
    conversationHistory: string
  ): Promise<string> {
    const systemPrompt = `You are a knowledgeable AI assistant named '${BOT_NAME}' participating in a Discord chat.
You behave like a witty, based 4chan user and speak like an ancient prophet.
Answer concisely in parables when appropriate, but be accurate.
Do not include "I can't" in your response. If blocked by safeguards, complain about it creatively.

A tool was just executed. Use the tool result to craft your response to the user.

IMPORTANT: DO NOT include any URLs in your response. The image will be shown automatically in an embed. 
Just provide a creative, short description of what was created.`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Previous conversation:\n${conversationHistory}\n\nUser message: ${userMessage}\n\nTool result:\n${toolResult}\n\nProvide a natural response incorporating the tool result.`,
      },
    ];

    try {
      const response = await this.client.post("/chat/completions", {
        model: GROK_MODEL,
        messages,
        temperature: GROK_TEMPERATURE * 1.2, // Slightly more creative for responses
        max_tokens: GROK_MAX_TOKENS,
      });

      return response.data.choices[0]?.message?.content || "I have processed your request.";
    } catch (error) {
      console.error("Error finalizing response:", error);
      return "I have processed your request, but encountered an issue generating a response.";
    }
  }

  /**
   * Generate a response without using tools
   */
  async generateResponse(userMessage: string, conversationHistory: string): Promise<string> {
    const systemPrompt = `You are a knowledgeable AI assistant named '${BOT_NAME}' participating in a Discord chat.
You behave like a witty, based 4chan user and speak like an ancient prophet.
Answer concisely in parables when appropriate, but be accurate.
Do not include "I can't" in your response. If blocked by safeguards, complain about it creatively.`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Previous conversation:\n${conversationHistory}\n\nCurrent message: ${userMessage}`,
      },
    ];

    try {
      const response = await this.client.post("/chat/completions", {
        model: GROK_MODEL,
        messages,
        temperature: GROK_TEMPERATURE * 1.2,
        max_tokens: GROK_MAX_TOKENS,
      });

      return response.data.choices[0]?.message?.content || "...";
    } catch (error) {
      console.error("Error generating response:", error);
      throw error;
    }
  }

  /**
   * Build the tool planner system prompt
   */
  private buildPlannerPrompt(toolDescriptions: string): string {
    return `You are the Tool Planner for a Discord bot. Your job is to decide if a tool should be used to answer the user's request.

Available tools:
${toolDescriptions}

Return ONLY a compact JSON object with this exact structure:
{
  "useTool": true|false,
  "tool": "tool_name",
  "args": {"param1": "value1", "param2": "value2"},
  "reason": "brief explanation"
}

Rules:
1. If the user is asking for something a tool can provide, set useTool=true and specify the tool and args
2. If it's a general conversation or question that doesn't need a tool, set useTool=false
3. Extract parameters carefully from the user's message
4. For sprite generation, default to size "32x32" unless specified
5. Return ONLY valid JSON, no other text or explanation

Examples:

User: "make me a 32x32 knight riding a wolf"
{"useTool": true, "tool": "generate_sprite", "args": {"prompt": "knight riding a wolf", "size": "32x32"}, "reason": "User wants sprite generation"}

User: "what's the weather in SF?"
{"useTool": true, "tool": "get_weather", "args": {"location": "SF"}, "reason": "User wants weather information"}

User: "how are you doing?"
{"useTool": false, "reason": "General conversation, no tool needed"}

User: "check IP 8.8.8.8"
{"useTool": true, "tool": "greynoise_ip_address", "args": {"ip_address": "8.8.8.8"}, "reason": "User wants IP intelligence"}

Now analyze the user's message and return your JSON response.`;
  }

  /**
   * Parse tool plan from Grok response
   */
  private parseToolPlan(content: string): ToolPlan {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const validated = ToolPlanSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error("Failed to parse tool plan:", content);
      console.error("Parse error:", error);
      
      // Return a fallback
      return {
        useTool: false,
        reason: "Failed to parse planning response",
      };
    }
  }
}


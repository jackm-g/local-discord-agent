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
  GROK_PLANNER_PROMPT,
  GROK_RESPONSE_PROMPT,
  GROK_GENERAL_PROMPT,
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
    const systemPrompt = GROK_PLANNER_PROMPT.replace('{TOOL_DESCRIPTIONS}', toolDescriptions);

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
    const systemPrompt = GROK_RESPONSE_PROMPT.replace('{BOT_NAME}', BOT_NAME);

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
    const systemPrompt = GROK_GENERAL_PROMPT.replace('{BOT_NAME}', BOT_NAME);

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


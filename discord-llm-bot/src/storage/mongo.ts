/**
 * MongoDB client for conversation persistence
 */
import { MongoClient, Db, Collection } from "mongodb";
import { ConversationHistory, ConversationMessage } from "../types.js";
import { MONGO_URI } from "../config.js";

export class ConversationStore {
  private client: MongoClient;
  private db: Db | null = null;
  private conversations: Collection<ConversationHistory> | null = null;

  constructor() {
    this.client = new MongoClient(MONGO_URI);
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db("discord_bot");
      this.conversations = this.db.collection<ConversationHistory>("conversations");

      // Create index on channelId
      await this.conversations.createIndex({ channelId: 1 });

      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  /**
   * Get conversation history for a channel
   */
  async getHistory(channelId: string, limit: number = 20): Promise<ConversationMessage[]> {
    if (!this.conversations) {
      throw new Error("MongoDB not connected");
    }

    const conversation = await this.conversations.findOne({ channelId });

    if (!conversation) {
      return [];
    }

    // Return most recent messages (up to limit)
    return conversation.messages.slice(-limit);
  }

  /**
   * Add a message to conversation history
   */
  async addMessage(channelId: string, message: ConversationMessage): Promise<void> {
    if (!this.conversations) {
      throw new Error("MongoDB not connected");
    }

    await this.conversations.updateOne(
      { channelId },
      {
        $push: {
          messages: {
            $each: [message],
            $slice: -100, // Keep only last 100 messages
          },
        },
        $set: { lastUpdated: new Date() },
        $setOnInsert: { channelId },
      },
      { upsert: true }
    );
  }

  /**
   * Add multiple messages at once
   */
  async addMessages(channelId: string, messages: ConversationMessage[]): Promise<void> {
    if (!this.conversations) {
      throw new Error("MongoDB not connected");
    }

    await this.conversations.updateOne(
      { channelId },
      {
        $push: {
          messages: {
            $each: messages,
            $slice: -100, // Keep only last 100 messages
          },
        },
        $set: { lastUpdated: new Date() },
        $setOnInsert: { channelId },
      },
      { upsert: true }
    );
  }

  /**
   * Clear conversation history for a channel
   */
  async clearHistory(channelId: string): Promise<void> {
    if (!this.conversations) {
      throw new Error("MongoDB not connected");
    }

    await this.conversations.deleteOne({ channelId });
  }

  /**
   * Get formatted history for Grok (compact format)
   */
  async getFormattedHistory(channelId: string, limit: number = 10): Promise<string> {
    const history = await this.getHistory(channelId, limit);

    if (history.length === 0) {
      return "No previous conversation history.";
    }

    return history
      .map((msg) => {
        if (msg.role === "tool") {
          return `[Tool: ${msg.toolName}]\nResult: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? "..." : ""}`;
        }
        return `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`;
      })
      .join("\n\n");
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
    await this.client.close();
    console.log("MongoDB connection closed");
  }
}


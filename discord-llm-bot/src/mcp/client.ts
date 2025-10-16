/**
 * MCP Client Manager - spawns and manages MCP server connections
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPServerConfig, ToolCallResult } from "../types.js";
import { spawn, ChildProcess } from "child_process";

interface MCPConnection {
  config: MCPServerConfig;
  client: Client;
  transport: StdioClientTransport;
  process: ChildProcess;
}

export class MCPClientManager {
  private connections: Map<string, MCPConnection> = new Map();
  private toolToServer: Map<string, string> = new Map();

  /**
   * Initialize MCP servers
   */
  async initialize(serverConfigs: MCPServerConfig[]): Promise<void> {
    console.log("Initializing MCP servers...");

    for (const config of serverConfigs) {
      try {
        await this.connectToServer(config);
        console.log(`✅ Connected to MCP server: ${config.name}`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${config.name}:`, error);
        throw error;
      }
    }

    console.log("All MCP servers initialized successfully");
  }

  /**
   * Connect to a single MCP server
   */
  private async connectToServer(config: MCPServerConfig): Promise<void> {
    // Spawn the server process
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    for (const [key, value] of Object.entries(config.env || {})) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    
    const serverProcess = spawn(config.command, config.args, {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Log stderr for debugging
    serverProcess.stderr?.on("data", (data) => {
      console.error(`[${config.name}] ${data.toString()}`);
    });

    serverProcess.on("error", (error) => {
      console.error(`[${config.name}] Process error:`, error);
    });

    serverProcess.on("exit", (code, signal) => {
      console.log(`[${config.name}] Process exited with code ${code}, signal ${signal}`);
    });

    // Create stdio transport
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env,
    });

    // Create MCP client
    const client = new Client(
      {
        name: "discord-bot-client",
        version: "2.0.0",
      },
      {
        capabilities: {},
      }
    );

    // Connect to server
    await client.connect(transport);

    // List available tools to verify connection
    const toolsList = await client.listTools();
    console.log(`[${config.name}] Available tools:`, toolsList.tools.map((t) => t.name));

    // Store connection
    this.connections.set(config.name, {
      config,
      client,
      transport,
      process: serverProcess,
    });

    // Map tools to server
    for (const toolName of config.tools) {
      this.toolToServer.set(toolName, config.name);
      console.log(`[MCP] Mapped tool "${toolName}" -> ${config.name}`);
    }
  }

  /**
   * Call a tool by name
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<ToolCallResult> {
    console.log(`[MCP] Attempting to call tool: "${toolName}"`);
    console.log(`[MCP] Available tools:`, Array.from(this.toolToServer.keys()));
    const serverName = this.toolToServer.get(toolName);
    if (!serverName) {
      return {
        success: false,
        content: "",
        error: `Unknown tool: ${toolName}`,
      };
    }

    const connection = this.connections.get(serverName);
    if (!connection) {
      return {
        success: false,
        content: "",
        error: `MCP server not connected: ${serverName}`,
      };
    }

    try {
      // Call tool with 6-minute timeout for large sprite generation
      const result = await connection.client.callTool(
        {
          name: toolName,
          arguments: args,
        },
        undefined, // resultSchema - use default
        { timeout: 360000 } // 6 minutes timeout
      );

      // Extract content from result
      let content = "";
      let imageUrl: string | undefined;
      let metadata: Record<string, any> = {};

      if (!result.content || !Array.isArray(result.content)) {
        return {
          success: false,
          content: "",
          error: "Invalid response from MCP server",
        };
      }

      for (const item of result.content) {
        if (item.type === "text") {
          content += item.text;
          
          // Try to parse JSON metadata
          try {
            const parsed = JSON.parse(item.text);
            metadata = parsed;
            if (parsed.imageUrl) {
              imageUrl = parsed.imageUrl;
            }
            if (parsed.spriteSheetUrl) {
              imageUrl = parsed.spriteSheetUrl;
            }
            if (parsed.animationUrl) {
              imageUrl = parsed.animationUrl;
            }
          } catch {
            // Not JSON, just keep as text
          }
        } else if (item.type === "image") {
          imageUrl = item.data;
        }
      }

      return {
        success: true,
        content,
        imageUrl,
        metadata,
      };
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      return {
        success: false,
        content: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get list of all available tools
   */
  getAvailableTools(): string[] {
    return Array.from(this.toolToServer.keys());
  }

  /**
   * Get tool descriptions for Grok prompt
   */
  async getToolDescriptions(): Promise<string> {
    const descriptions: string[] = [];

    for (const [serverName, connection] of this.connections) {
      try {
        const toolsList = await connection.client.listTools();
        for (const tool of toolsList.tools) {
          const params = JSON.stringify(tool.inputSchema, null, 0);
          descriptions.push(`- ${tool.name}: ${tool.description}\n  Input: ${params}`);
        }
      } catch (error) {
        console.error(`Failed to list tools from ${serverName}:`, error);
      }
    }

    return descriptions.join("\n\n");
  }

  /**
   * Cleanup - close all connections
   */
  async cleanup(): Promise<void> {
    console.log("Cleaning up MCP connections...");

    for (const [serverName, connection] of this.connections) {
      try {
        await connection.client.close();
        connection.process.kill();
        console.log(`Closed connection to ${serverName}`);
      } catch (error) {
        console.error(`Error closing ${serverName}:`, error);
      }
    }

    this.connections.clear();
    this.toolToServer.clear();
  }
}


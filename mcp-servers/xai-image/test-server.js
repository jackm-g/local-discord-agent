#!/usr/bin/env node

/**
 * Test script for X.AI Image Generation MCP Server
 * This script tests the MCP server directly without Discord
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

async function testXAIImageServer() {
  console.log("🧪 Testing X.AI Image Generation MCP Server...");
  
  // Check if API key is available
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error("❌ XAI_API_KEY environment variable is required");
    console.log("Please set your X.AI API key in the environment or .env file");
    process.exit(1);
  }
  
  console.log("✅ X.AI API key found");
  
  // Spawn the MCP server process
  const serverProcess = spawn("node", ["dist/server.js"], {
    cwd: "/Users/jack/Development/local-discord-agent/mcp-servers/xai-image",
    env: {
      ...process.env,
      XAI_API_KEY: apiKey,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Log server output
  serverProcess.stderr?.on("data", (data) => {
    console.log(`[Server] ${data.toString().trim()}`);
  });

  serverProcess.on("error", (error) => {
    console.error("❌ Server process error:", error);
  });

  serverProcess.on("exit", (code, signal) => {
    console.log(`[Server] Process exited with code ${code}, signal ${signal}`);
  });

  try {
    // Create MCP client
    const transport = new StdioClientTransport({
      command: "node",
      args: ["dist/server.js"],
      env: {
        ...process.env,
        XAI_API_KEY: apiKey,
      },
    });

    const client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // Connect to server
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // List available tools
    const toolsList = await client.listTools();
    console.log("📋 Available tools:", toolsList.tools.map(t => t.name));

    // Test image generation
    console.log("🎨 Testing image generation...");
    const result = await client.callTool({
      name: "generate_image",
      arguments: {
        prompt: "A cute robot cat sitting on a rainbow",
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
        n: 1,
      },
    });

    console.log("📊 Tool call result:");
    console.log(JSON.stringify(result, null, 2));

    // Check if we got images
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === "text") {
          try {
            const parsed = JSON.parse(item.text);
            if (parsed.success && parsed.images && parsed.images.length > 0) {
              console.log("✅ Image generation successful!");
              console.log("🖼️ Generated images:");
              parsed.images.forEach((img: any, index: number) => {
                console.log(`  ${index + 1}. ${img.url}`);
                if (img.revised_prompt) {
                  console.log(`     Revised prompt: ${img.revised_prompt}`);
                }
              });
            } else {
              console.log("❌ Image generation failed:", parsed.error);
            }
          } catch (e) {
            console.log("📝 Raw response:", item.text);
          }
        }
      }
    }

    // Cleanup
    await client.close();
    serverProcess.kill();
    
    console.log("✅ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    serverProcess.kill();
    process.exit(1);
  }
}

// Run the test
testXAIImageServer().catch(console.error);

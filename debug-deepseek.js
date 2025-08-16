import { DeepSeekClient } from "./dist/services/deepseek.js";

async function testDeepSeek() {
  console.log("Testing DeepSeek client...");

  // Use a dummy API key for testing
  const client = new DeepSeekClient("test-key");

  try {
    // Just log what would be sent without actually making the request
    console.log("Testing chat method with sample text...");
    await client.chat("test text", "PROCESS");
  } catch (error) {
    console.log("Error details:", error.message);
    if (error.config && error.config.data) {
      console.log("Request data being sent:", error.config.data);
      const parsed = JSON.parse(error.config.data);
      console.log("Parsed request:", JSON.stringify(parsed, null, 2));
      console.log(
        "System message content type:",
        typeof parsed.messages[0].content,
      );
      console.log("System message content value:", parsed.messages[0].content);
    }
  }
}

testDeepSeek();

const fs = require('fs');
const path = require('path');

function verifySetupDeepseek() {
    console.log("🧪 Running static check for setup_openclaw_deepseek.py...");
    const filePath = path.join(__dirname, "..", "setup_openclaw_deepseek.py");
    
    if (!fs.existsSync(filePath)) {
        console.error("❌ Error: setup_openclaw_deepseek.py does not exist.");
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check that pop('mcpServers') is removed
    if (content.includes("data.pop('mcpServers'")) {
        console.error("❌ Error: The script still contains data.pop('mcpServers')!");
        process.exit(1);
    }
    
    // Verify that MCP settings are NOT injected into openclaw.json configuration (to avoid schema crashes)
    if (content.includes("data['mcp']") || content.includes("mcpServers")) {
        console.error("❌ Error: The script still contains references to mcp/mcpServers configuration!");
        process.exit(1);
    }
    
    // Verify that Dify provider configuration is present
    if (!content.includes("data['models']['providers']['dify']")) {
        console.error("❌ Error: The script is missing Dify provider configuration!");
        process.exit(1);
    }
    
    console.log("✅ Static checks PASSED! setup_openclaw_deepseek.py is correct.");
    process.exit(0);
}

verifySetupDeepseek();

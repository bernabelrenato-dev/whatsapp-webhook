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
    
    // Check that all three MCP configurations are present
    const expectedKeys = [
        "data['mcp']['servers']['openhands']",
        "data['mcp']['servers']['opencode']",
        "data['mcp']['servers']['hostinger']",
        "http://jgis-openhands-mcp:6363/sse",
        "http://jgis-opencode-mcp:3000/sse",
        "http://jgis-hostinger-mcp:3000/sse"
    ];
    
    for (const key of expectedKeys) {
        if (!content.includes(key)) {
            console.error(`❌ Error: Missing expected string: "${key}"`);
            process.exit(1);
        }
    }
    
    console.log("✅ Static checks PASSED! setup_openclaw_deepseek.py is correct.");
    process.exit(0);
}

verifySetupDeepseek();

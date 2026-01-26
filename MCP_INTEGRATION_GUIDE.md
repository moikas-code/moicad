# MCP Integration Guide - moicad

Guide for integrating moicad with Claude Desktop via Model Context Protocol (MCP).

## What is MCP?

Model Context Protocol (MCP) is Anthropic's standard for connecting AI assistants (like Claude) to external tools and data sources. It allows Claude Desktop to:
- Evaluate OpenSCAD code in real-time
- Generate 3D models from natural language
- Access moicad's CAD capabilities directly from chat

## Architecture

```
Claude Desktop
    ↓ (MCP Protocol)
MCP Server (moicad backend)
    ↓ (REST API)
moicad Backend (Bun)
    ↓ (manifold-3d)
3D Geometry Output
```

## Configuration

### Option 1: Direct API Access (Recommended)

Claude Desktop can access moicad's REST API directly without needing a separate MCP server.

**Claude Desktop Config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "moicad": {
      "command": "node",
      "args": ["-e", "require('http').createServer((req,res)=>{if(req.method==='POST'){let body='';req.on('data',d=>body+=d);req.on('end',()=>{fetch('http://localhost:42069/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body}).then(r=>r.json()).then(d=>res.end(JSON.stringify(d)));})}}).listen(3000)"]
    }
  }
}
```

This starts a simple proxy server that forwards Claude's requests to moicad's API.

### Option 2: Custom MCP Server (Advanced)

For more control, create a dedicated MCP server that wraps moicad's API.

**File**: `backend/mcp-bridge.ts`

```typescript
#!/usr/bin/env bun

/**
 * MCP Bridge Server for Claude Desktop
 * Exposes moicad OpenSCAD evaluation as MCP tools
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = process.env.MOICAD_API || "http://localhost:42069";

// Create MCP server
const server = new Server(
  {
    name: "moicad",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register moicad tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "evaluate_scad",
        description: "Evaluate OpenSCAD code and generate 3D geometry",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "OpenSCAD code to evaluate (e.g., 'cube(10);')",
            },
          },
          required: ["code"],
        },
      },
      {
        name: "parse_scad",
        description: "Parse OpenSCAD code to AST without evaluating",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "OpenSCAD code to parse",
            },
          },
          required: ["code"],
        },
      },
      {
        name: "export_stl",
        description: "Export geometry to STL file format",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "OpenSCAD code to evaluate and export",
            },
            filename: {
              type: "string",
              description: "Output filename (default: model.stl)",
            },
          },
          required: ["code"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "evaluate_scad": {
        const response = await fetch(`${API_BASE}/api/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: args.code }),
        });

        const data = await response.json();

        if (!data.success) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${data.errors.map((e: any) => e.message).join(", ")}`,
              },
            ],
          };
        }

        const { geometry } = data;
        return {
          content: [
            {
              type: "text",
              text: `✅ Geometry generated successfully!

📊 Statistics:
- Vertices: ${geometry.stats.vertexCount}
- Faces: ${geometry.stats.faceCount}
- Volume: ${geometry.stats.volume.toFixed(2)} mm³
- Bounds: [${geometry.bounds.min.join(", ")}] to [${geometry.bounds.max.join(", ")}]

🎨 View at: http://localhost:3002 (paste your code in the editor)`,
            },
          ],
        };
      }

      case "parse_scad": {
        const response = await fetch(`${API_BASE}/api/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: args.code }),
        });

        const data = await response.json();

        if (!data.success) {
          return {
            content: [
              {
                type: "text",
                text: `Parse Error: ${data.errors.map((e: any) => e.message).join(", ")}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Code parsed successfully!\n\nAST:\n${JSON.stringify(data.ast, null, 2)}`,
            },
          ],
        };
      }

      case "export_stl": {
        const filename = args.filename || "model.stl";

        // First evaluate
        const evalResponse = await fetch(`${API_BASE}/api/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: args.code }),
        });

        const evalData = await evalResponse.json();

        if (!evalData.success) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${evalData.errors.map((e: any) => e.message).join(", ")}`,
              },
            ],
          };
        }

        // Then export
        const exportResponse = await fetch(`${API_BASE}/api/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            geometry: evalData.geometry,
            format: "stl",
          }),
        });

        const stlData = await exportResponse.arrayBuffer();

        return {
          content: [
            {
              type: "text",
              text: `✅ STL exported successfully!

Filename: ${filename}
Size: ${(stlData.byteLength / 1024).toFixed(2)} KB
Faces: ${evalData.geometry.stats.faceCount}

Note: STL data generated but not saved to disk (MCP limitation).
To save, copy your code to http://localhost:3002 and use Export → STL.`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("moicad MCP server running");
}

main().catch(console.error);
```

**Claude Desktop Config**:
```json
{
  "mcpServers": {
    "moicad": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/moicad/backend/mcp-bridge.ts"],
      "env": {
        "MOICAD_API": "http://localhost:42069"
      }
    }
  }
}
```

### Option 3: Standalone MCP Server Package

Create an npm package for easy distribution:

```bash
cd backend
bun init -y mcp-moicad-server
```

**package.json**:
```json
{
  "name": "mcp-moicad-server",
  "version": "1.0.0",
  "bin": {
    "mcp-moicad": "./mcp-bridge.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  }
}
```

Then users can install globally:
```bash
npm install -g mcp-moicad-server
```

**Claude Desktop Config**:
```json
{
  "mcpServers": {
    "moicad": {
      "command": "mcp-moicad"
    }
  }
}
```

## Usage Examples

Once configured, ask Claude:

**Example 1: Generate a cube**
```
User: "Can you create a 10mm cube using moicad?"

Claude: *calls evaluate_scad with code: "cube(10);"*

✅ Geometry generated successfully!

📊 Statistics:
- Vertices: 8
- Faces: 12
- Volume: 1000.00 mm³
```

**Example 2: Complex design**
```
User: "Create a hollow sphere with radius 20mm and wall thickness 2mm"

Claude: *generates OpenSCAD code*
```scad
difference() {
  sphere(20);
  sphere(18);
}
```

*calls evaluate_scad*

✅ Geometry generated successfully!

📊 Statistics:
- Vertices: 1280
- Faces: 2560
- Volume: 29321.53 mm³
```

**Example 3: Validate syntax**
```
User: "Is this OpenSCAD code valid? cube([10, 20)"

Claude: *calls parse_scad*

Parse Error: Unexpected token ']' at line 1, column 15
Expected: ']' to close array
```

## Testing MCP Integration

### 1. Start moicad backend
```bash
cd /path/to/moicad
bun run dev
```

### 2. Test with curl
```bash
# Test evaluate endpoint
curl -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'
```

### 3. Configure Claude Desktop
Add moicad to MCP config (see options above)

### 4. Restart Claude Desktop
Close and reopen Claude Desktop app

### 5. Test in Claude
```
You: "Can you evaluate this OpenSCAD code using moicad: cube(10);"
```

Claude should call the MCP tool and return geometry stats.

## Troubleshooting

### moicad backend not running
```bash
# Check if backend is running
curl http://localhost:42069/health

# If not, start it
cd /path/to/moicad
bun run dev
```

### MCP server not connecting
```bash
# Check Claude Desktop logs
tail -f ~/Library/Logs/Claude/mcp*.log

# Test MCP bridge directly
echo '{"method":"tools/list"}' | bun run backend/mcp-bridge.ts
```

### Permission denied
```bash
# Make bridge executable
chmod +x backend/mcp-bridge.ts

# Add shebang to top of file
#!/usr/bin/env bun
```

## Security Considerations

**⚠️ Important**: The MCP server runs locally and has full access to moicad's API.

- Only use on trusted local machines
- Don't expose moicad backend to the internet without authentication
- MCP bridge should only connect to localhost
- Consider rate limiting for production use

## Future Enhancements

- [ ] Multi-user collaboration via MCP
- [ ] Streaming geometry updates
- [ ] 3D preview in Claude (via base64 images)
- [ ] Direct STL download from Claude
- [ ] Project management (save/load)
- [ ] Version control integration

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/anthropics/mcp-typescript)
- [Claude Desktop](https://claude.ai/desktop)
- [moicad API Documentation](./BUILD_GUIDE.md#api-usage-examples)

---

**Happy CAD Design with AI! 🤖🔧**

/**
 * MCP Server - Exposes moicad CAD operations as MCP tools
 * Allows Claude and other AI systems to parse, evaluate, and export 3D models
 */

import {
  Server,
  Tool,
  TextContent,
  Response,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Import backend functions (when integrated with backend)
// For now, we'll create a simple MCP interface

const server = new Server({
  name: "moicad-mcp",
  version: "0.1.0",
});

// Define available tools
const tools: Tool[] = [
  {
    name: "parse_openscad",
    description:
      "Parse OpenSCAD code and return the Abstract Syntax Tree (AST). This validates syntax without evaluating.",
    inputSchema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "OpenSCAD code to parse (e.g., 'cube(10);')",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "evaluate_openscad",
    description:
      "Parse and evaluate OpenSCAD code to generate 3D geometry. Returns vertices, faces, and statistics.",
    inputSchema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "OpenSCAD code to evaluate",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "get_primitives",
    description: "Get list of available primitive shapes and their parameters.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_operations",
    description:
      "Get list of available transformations and CSG boolean operations.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "export_model",
    description:
      "Export evaluated geometry to various 3D file formats (STL, OBJ, 3MF).",
    inputSchema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "OpenSCAD code to evaluate and export",
        },
        format: {
          type: "string",
          enum: ["stl", "obj", "3mf"],
          description:
            "Export format (STL for 3D printing, OBJ for 3D models, 3MF for models with color)",
        },
        binary: {
          type: "boolean",
          description:
            "For STL format: true for binary, false for ASCII (default: true)",
        },
      },
      required: ["code", "format"],
    },
  },
  {
    name: "validate_syntax",
    description:
      "Validate OpenSCAD syntax without evaluating. Returns any parse errors.",
    inputSchema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "OpenSCAD code to validate",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "get_model_info",
    description:
      "Get metadata about an evaluated model: bounds, vertex count, face count, volume.",
    inputSchema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "OpenSCAD code to analyze",
        },
      },
      required: ["code"],
    },
  },
];

// Tool request handler
server.setRequestHandler(async (request) => {
  if (request.method === "tools/list") {
    return { tools };
  }

  if (request.method === "tools/call") {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "parse_openscad":
        return await handleParse(args as { code: string });

      case "evaluate_openscad":
        return await handleEvaluate(args as { code: string });

      case "get_primitives":
        return handleGetPrimitives();

      case "get_operations":
        return handleGetOperations();

      case "export_model":
        return await handleExportModel(
          args as { code: string; format: string; binary?: boolean },
        );

      case "validate_syntax":
        return await handleValidateSyntax(args as { code: string });

      case "get_model_info":
        return await handleGetModelInfo(args as { code: string });

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Unknown method: ${request.method}`,
      },
    ],
    isError: true,
  };
});

// Handler implementations
async function handleParse(args: {
  code: string;
}): Promise<Response & { isError?: boolean }> {
  try {
    const response = await fetch("http://localhost:42069/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    const data = await response.json();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error parsing code: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleEvaluate(args: {
  code: string;
}): Promise<Response & { isError?: boolean }> {
  try {
    const response = await fetch("http://localhost:42069/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    const data = await response.json();

    // Return summary instead of full geometry data
    const summary = {
      success: data.success,
      errors: data.errors,
      geometry: data.geometry
        ? {
            vertexCount: data.geometry.stats.vertexCount,
            faceCount: data.geometry.stats.faceCount,
            bounds: data.geometry.bounds,
            volume: data.geometry.stats.volume,
          }
        : null,
      executionTime: data.executionTime,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error evaluating code: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

function handleGetPrimitives(): Response & { isError?: boolean } {
  const primitives = [
    {
      name: "cube",
      params: ["size"],
      defaults: { size: 10 },
      description: "Create a cube with specified size",
      example: "cube(10);",
    },
    {
      name: "sphere",
      params: ["radius", "$fn"],
      defaults: { radius: 5, $fn: 20 },
      description: "Create a sphere with specified radius and detail level",
      example: "sphere(r=8, $fn=32);",
    },
    {
      name: "cylinder",
      params: ["radius", "height", "$fn"],
      defaults: { radius: 5, height: 10, $fn: 20 },
      description: "Create a cylinder",
      example: "cylinder(r=5, h=10, $fn=32);",
    },
    {
      name: "cone",
      params: ["radius", "height", "$fn"],
      defaults: { radius: 5, height: 10, $fn: 20 },
      description: "Create a cone",
      example: "cone(r=5, h=10, $fn=32);",
    },
    {
      name: "circle",
      params: ["radius", "$fn"],
      defaults: { radius: 5, $fn: 20 },
      description: "Create a 2D circle",
      example: "circle(r=5, $fn=32);",
    },
    {
      name: "square",
      params: ["size"],
      defaults: { size: 10 },
      description: "Create a 2D square",
      example: "square(10);",
    },
  ];

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(primitives, null, 2),
      },
    ],
  };
}

function handleGetOperations(): Response & { isError?: boolean } {
  const operations = {
    transformations: [
      {
        name: "translate",
        params: ["[x, y, z]"],
        description: "Move geometry along axes",
        example: "translate([5, 0, 0]) cube(10);",
      },
      {
        name: "rotate",
        params: ["angle, [x, y, z]"],
        description: "Rotate geometry (angle in degrees)",
        example: "rotate([0, 45, 0]) cube(10);",
      },
      {
        name: "scale",
        params: ["[x, y, z]"],
        description: "Scale geometry along axes",
        example: "scale([2, 1, 0.5]) cube(10);",
      },
      {
        name: "mirror",
        params: ["[x, y, z]"],
        description: "Mirror geometry across plane",
        example: "mirror([1, 0, 0]) cube(10);",
      },
      {
        name: "multmatrix",
        params: ["4x4 matrix"],
        description: "Apply custom 4x4 transformation matrix",
        example:
          "multmatrix([[1,0,0,0],[0,1,0,0],[0,0,1,5],[0,0,0,1]]) cube(10);",
      },
    ],
    boolean_operations: [
      {
        name: "union",
        description: "Combine multiple shapes",
        example: "union(cube(10), translate([8, 0, 0]) sphere(5));",
      },
      {
        name: "difference",
        description:
          "Subtract second shape from first (currently returns first)",
        example: "difference(cube(10), sphere(6));",
      },
      {
        name: "intersection",
        description: "Keep only overlapping parts (currently returns first)",
        example: "intersection(cube(10), sphere(7));",
      },
    ],
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(operations, null, 2),
      },
    ],
  };
}

async function handleExportModel(args: {
  code: string;
  format: string;
  binary?: boolean;
}): Promise<Response & { isError?: boolean }> {
  try {
    // First evaluate the code
    const evalResponse = await fetch("http://localhost:42069/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: args.code }),
    });

    const evalData = await evalResponse.json();

    if (!evalData.success || !evalData.geometry) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Cannot export: ${evalData.errors.map((e: any) => e.message).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    // Export to requested format
    const exportResponse = await fetch("http://localhost:42069/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        geometry: evalData.geometry,
        format: args.format,
        binary: args.binary !== false,
      }),
    });

    if (!exportResponse.ok) {
      throw new Error(`Export failed: ${exportResponse.statusText}`);
    }

    const fileData = await exportResponse.arrayBuffer();
    const base64 = Buffer.from(fileData).toString("base64");

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully exported to ${args.format.toUpperCase()}\nFile size: ${fileData.byteLength} bytes\nBase64 (first 200 chars): ${base64.substring(0, 200)}...`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error exporting model: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleValidateSyntax(args: {
  code: string;
}): Promise<Response & { isError?: boolean }> {
  try {
    const response = await fetch("http://localhost:42069/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Syntax errors found:\n${data.errors.map((e: any) => `- ${e.message}`).join("\n")}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: "Syntax is valid!",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error validating syntax: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGetModelInfo(args: {
  code: string;
}): Promise<Response & { isError?: boolean }> {
  try {
    const response = await fetch("http://localhost:42069/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    const data = await response.json();

    if (!data.success || !data.geometry) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${data.errors.map((e: any) => e.message).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    const info = {
      vertices: data.geometry.stats.vertexCount,
      faces: data.geometry.stats.faceCount,
      bounds: {
        min: data.geometry.bounds.min,
        max: data.geometry.bounds.max,
        size: [
          data.geometry.bounds.max[0] - data.geometry.bounds.min[0],
          data.geometry.bounds.max[1] - data.geometry.bounds.min[1],
          data.geometry.bounds.max[2] - data.geometry.bounds.min[2],
        ],
      },
      executionTime: data.executionTime,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error getting model info: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// Start server
const transport = new StdioServerTransport();
transport.connect(server);

console.error("moicad MCP Server started on stdio transport");

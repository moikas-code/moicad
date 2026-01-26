/**
 * Custom WebGL2 Renderer for BSP Meshes
 * Provides direct control over rendering without Three.js assumptions
 */

import {
  vertexShaderSource,
  fragmentShaderSource,
  gridVertexShader,
  gridFragmentShader,
} from "./shaders";
import {
  Vec3,
  Mat4,
  mat4Identity,
  mat4Multiply,
  mat4Perspective,
  mat4LookAt,
  mat4RotateX,
  mat3NormalFromMat4,
  degToRad,
} from "./math";

export interface WebGLRendererConfig {
  canvas: HTMLCanvasElement;
  clearColor?: Vec3;
}

export interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

interface ShaderProgram {
  program: WebGLProgram;
  attribs: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation>;
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;

  // Shader programs
  private meshProgram: ShaderProgram | null = null;
  private gridProgram: ShaderProgram | null = null;

  // Mesh buffers
  private meshVAO: WebGLVertexArrayObject | null = null;
  private meshVertexBuffer: WebGLBuffer | null = null;
  private meshNormalBuffer: WebGLBuffer | null = null;
  private meshIndexBuffer: WebGLBuffer | null = null;
  private meshIndexCount = 0;

  // Grid buffers
  private gridVAO: WebGLVertexArrayObject | null = null;
  private gridVertexBuffer: WebGLBuffer | null = null;
  private gridVertexCount = 0;

  // Axis buffers
  private axisVAO: WebGLVertexArrayObject | null = null;
  private axisVertexBuffer: WebGLBuffer | null = null;
  private axisVertexCount = 0;

  // Camera state
  private cameraPosition: Vec3 = [50, 50, 50];
  private cameraTarget: Vec3 = [0, 0, 0];
  private cameraUp: Vec3 = [0, 0, 1]; // Z-up like OpenSCAD
  private fov = 60;
  private near = 0.1;
  private far = 10000;

  // Model state
  private modelMatrix: Mat4 = mat4Identity();

  // Lighting
  private lightDirection: Vec3 = [0.5, 0.7, 1.0];
  private lightColor: Vec3 = [1.0, 1.0, 1.0];
  private ambientColor: Vec3 = [0.3, 0.3, 0.3];
  private objectColor: Vec3 = [0.5, 0.5, 0.5]; // Gray like OpenSCAD
  private shininess = 32.0;

  // Settings
  private clearColor: Vec3;
  private showGrid = true;
  private showAxes = true;

  constructor(config: WebGLRendererConfig) {
    this.canvas = config.canvas;
    this.clearColor = config.clearColor || [0, 0, 0]; // Black background

    const gl = this.canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      throw new Error("WebGL2 not supported");
    }

    this.gl = gl;
    this.init();
  }

  private init(): void {
    const gl = this.gl;

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Enable polygon offset to prevent Z-fighting on coplanar surfaces
    // Use larger offset for BSP meshes which have many near-coplanar fragments
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2.0, 2.0);

    // Enable back-face culling (we'll handle double-sided in shader)
    gl.disable(gl.CULL_FACE);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Compile shaders
    this.meshProgram = this.createShaderProgram(
      vertexShaderSource,
      fragmentShaderSource,
      ["a_position", "a_normal"],
      [
        "u_modelMatrix",
        "u_viewMatrix",
        "u_projectionMatrix",
        "u_normalMatrix",
        "u_cameraPosition",
        "u_lightDirection",
        "u_lightColor",
        "u_ambientColor",
        "u_objectColor",
        "u_shininess",
        "u_opacity",
      ],
    );

    this.gridProgram = this.createShaderProgram(
      gridVertexShader,
      gridFragmentShader,
      ["a_position", "a_color"],
      ["u_viewProjection"],
    );

    // Create grid
    this.createGrid(500, 10); // 500x500 grid with 10 unit spacing

    // Create axes
    this.createAxes(100);
  }

  private createShaderProgram(
    vertSrc: string,
    fragSrc: string,
    attribNames: string[],
    uniformNames: string[],
  ): ShaderProgram {
    const gl = this.gl;

    const vertShader = this.compileShader(gl.VERTEX_SHADER, vertSrc);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Failed to link shader program: ${info}`);
    }

    const attribs: Record<string, number> = {};
    for (const name of attribNames) {
      attribs[name] = gl.getAttribLocation(program, name);
    }

    const uniforms: Record<string, WebGLUniformLocation> = {};
    for (const name of uniformNames) {
      const loc = gl.getUniformLocation(program, name);
      if (loc) uniforms[name] = loc;
    }

    return { program, attribs, uniforms };
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Failed to compile shader: ${info}`);
    }

    return shader;
  }

  private createGrid(size: number, spacing: number): void {
    const gl = this.gl;
    const vertices: number[] = [];
    const half = size / 2;
    const gridColor: Vec3 = [0.3, 0.3, 0.3]; // Dark gray grid
    const axisColor: Vec3 = [0.5, 0.5, 0.5]; // Slightly brighter for axis lines

    // Create grid lines along X
    for (let i = -half; i <= half; i += spacing) {
      const color = i === 0 ? axisColor : gridColor;
      // Line along Y at this X
      vertices.push(-half, i, 0, ...color);
      vertices.push(half, i, 0, ...color);
    }

    // Create grid lines along Y
    for (let i = -half; i <= half; i += spacing) {
      const color = i === 0 ? axisColor : gridColor;
      // Line along X at this Y
      vertices.push(i, -half, 0, ...color);
      vertices.push(i, half, 0, ...color);
    }

    this.gridVAO = gl.createVertexArray();
    gl.bindVertexArray(this.gridVAO);

    this.gridVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const stride = 6 * 4; // 3 position + 3 color floats
    gl.enableVertexAttribArray(this.gridProgram!.attribs.a_position);
    gl.vertexAttribPointer(
      this.gridProgram!.attribs.a_position,
      3,
      gl.FLOAT,
      false,
      stride,
      0,
    );

    gl.enableVertexAttribArray(this.gridProgram!.attribs.a_color);
    gl.vertexAttribPointer(
      this.gridProgram!.attribs.a_color,
      3,
      gl.FLOAT,
      false,
      stride,
      12,
    );

    gl.bindVertexArray(null);

    this.gridVertexCount = vertices.length / 6;
  }

  private createAxes(length: number): void {
    const gl = this.gl;

    // RGB axes: X=Red, Y=Green, Z=Blue
    const vertices = new Float32Array([
      // X axis (red)
      0,
      0,
      0,
      1,
      0,
      0,
      length,
      0,
      0,
      1,
      0,
      0,
      // Y axis (green)
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      length,
      0,
      0,
      1,
      0,
      // Z axis (blue)
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      length,
      0,
      0,
      1,
    ]);

    this.axisVAO = gl.createVertexArray();
    gl.bindVertexArray(this.axisVAO);

    this.axisVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.axisVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const stride = 6 * 4;
    gl.enableVertexAttribArray(this.gridProgram!.attribs.a_position);
    gl.vertexAttribPointer(
      this.gridProgram!.attribs.a_position,
      3,
      gl.FLOAT,
      false,
      stride,
      0,
    );

    gl.enableVertexAttribArray(this.gridProgram!.attribs.a_color);
    gl.vertexAttribPointer(
      this.gridProgram!.attribs.a_color,
      3,
      gl.FLOAT,
      false,
      stride,
      12,
    );

    gl.bindVertexArray(null);

    this.axisVertexCount = 6;
  }

  setMesh(data: MeshData): void {
    const gl = this.gl;

    // Clean up old buffers
    if (this.meshVAO) gl.deleteVertexArray(this.meshVAO);
    if (this.meshVertexBuffer) gl.deleteBuffer(this.meshVertexBuffer);
    if (this.meshNormalBuffer) gl.deleteBuffer(this.meshNormalBuffer);
    if (this.meshIndexBuffer) gl.deleteBuffer(this.meshIndexBuffer);

    // Create VAO
    this.meshVAO = gl.createVertexArray();
    gl.bindVertexArray(this.meshVAO);

    // Vertex buffer
    this.meshVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.meshProgram!.attribs.a_position);
    gl.vertexAttribPointer(
      this.meshProgram!.attribs.a_position,
      3,
      gl.FLOAT,
      false,
      0,
      0,
    );

    // Normal buffer
    this.meshNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.meshNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.meshProgram!.attribs.a_normal);
    gl.vertexAttribPointer(
      this.meshProgram!.attribs.a_normal,
      3,
      gl.FLOAT,
      false,
      0,
      0,
    );

    // Index buffer
    this.meshIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    this.meshIndexCount = data.indices.length;
  }

  setCamera(position: Vec3, target: Vec3, up?: Vec3): void {
    this.cameraPosition = position;
    this.cameraTarget = target;
    if (up) this.cameraUp = up;
  }

  setObjectColor(color: Vec3): void {
    this.objectColor = color;
  }

  setLightDirection(dir: Vec3): void {
    this.lightDirection = dir;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  render(): void {
    const gl = this.gl;

    // Clear
    gl.clearColor(
      this.clearColor[0],
      this.clearColor[1],
      this.clearColor[2],
      1.0,
    );
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Calculate matrices
    const aspect = this.canvas.width / this.canvas.height;
    const projectionMatrix = mat4Perspective(
      degToRad(this.fov),
      aspect,
      this.near,
      this.far,
    );
    const viewMatrix = mat4LookAt(
      this.cameraPosition,
      this.cameraTarget,
      this.cameraUp,
    );
    const viewProjection = mat4Multiply(projectionMatrix, viewMatrix);

    // No coordinate system rotation - OpenSCAD and our renderer both use Z-up
    const modelMatrix = this.modelMatrix;
    const normalMatrix = mat3NormalFromMat4(modelMatrix);

    // Draw grid
    if (this.showGrid && this.gridVAO) {
      gl.useProgram(this.gridProgram!.program);
      gl.uniformMatrix4fv(
        this.gridProgram!.uniforms.u_viewProjection,
        false,
        viewProjection,
      );

      gl.bindVertexArray(this.gridVAO);
      gl.drawArrays(gl.LINES, 0, this.gridVertexCount);
    }

    // Draw axes
    if (this.showAxes && this.axisVAO) {
      gl.useProgram(this.gridProgram!.program);
      gl.uniformMatrix4fv(
        this.gridProgram!.uniforms.u_viewProjection,
        false,
        viewProjection,
      );

      gl.lineWidth(2.0); // May not work on all implementations
      gl.bindVertexArray(this.axisVAO);
      gl.drawArrays(gl.LINES, 0, this.axisVertexCount);
    }

    // Draw mesh
    if (this.meshVAO && this.meshIndexCount > 0) {
      gl.useProgram(this.meshProgram!.program);

      // Set uniforms
      gl.uniformMatrix4fv(
        this.meshProgram!.uniforms.u_modelMatrix,
        false,
        modelMatrix,
      );
      gl.uniformMatrix4fv(
        this.meshProgram!.uniforms.u_viewMatrix,
        false,
        viewMatrix,
      );
      gl.uniformMatrix4fv(
        this.meshProgram!.uniforms.u_projectionMatrix,
        false,
        projectionMatrix,
      );
      gl.uniformMatrix3fv(
        this.meshProgram!.uniforms.u_normalMatrix,
        false,
        normalMatrix,
      );

      gl.uniform3fv(
        this.meshProgram!.uniforms.u_cameraPosition,
        this.cameraPosition,
      );
      gl.uniform3fv(
        this.meshProgram!.uniforms.u_lightDirection,
        this.lightDirection,
      );
      gl.uniform3fv(this.meshProgram!.uniforms.u_lightColor, this.lightColor);
      gl.uniform3fv(
        this.meshProgram!.uniforms.u_ambientColor,
        this.ambientColor,
      );
      gl.uniform3fv(this.meshProgram!.uniforms.u_objectColor, this.objectColor);
      gl.uniform1f(this.meshProgram!.uniforms.u_shininess, this.shininess);
      gl.uniform1f(this.meshProgram!.uniforms.u_opacity, 1.0);

      gl.bindVertexArray(this.meshVAO);
      gl.drawElements(gl.TRIANGLES, this.meshIndexCount, gl.UNSIGNED_INT, 0);
    }

    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;

    if (this.meshVAO) gl.deleteVertexArray(this.meshVAO);
    if (this.meshVertexBuffer) gl.deleteBuffer(this.meshVertexBuffer);
    if (this.meshNormalBuffer) gl.deleteBuffer(this.meshNormalBuffer);
    if (this.meshIndexBuffer) gl.deleteBuffer(this.meshIndexBuffer);

    if (this.gridVAO) gl.deleteVertexArray(this.gridVAO);
    if (this.gridVertexBuffer) gl.deleteBuffer(this.gridVertexBuffer);

    if (this.axisVAO) gl.deleteVertexArray(this.axisVAO);
    if (this.axisVertexBuffer) gl.deleteBuffer(this.axisVertexBuffer);

    if (this.meshProgram) gl.deleteProgram(this.meshProgram.program);
    if (this.gridProgram) gl.deleteProgram(this.gridProgram.program);
  }
}

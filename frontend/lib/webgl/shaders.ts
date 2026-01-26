/**
 * GLSL Shaders for Custom WebGL Renderer
 * Optimized for BSP mesh rendering with flat shading
 */

export const vertexShaderSource = `#version 300 es
precision highp float;

// Attributes
in vec3 a_position;
in vec3 a_normal;

// Uniforms
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;

// Varyings (flat for true flat shading)
out vec3 v_worldPosition;
flat out vec3 v_normal;

void main() {
    vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
    v_worldPosition = worldPosition.xyz;
    v_normal = normalize(u_normalMatrix * a_normal);

    gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
}
`;

export const fragmentShaderSource = `#version 300 es
precision highp float;

// Varyings (flat normal from vertex shader)
in vec3 v_worldPosition;
flat in vec3 v_normal;

// Uniforms
uniform vec3 u_cameraPosition;
uniform vec3 u_lightDirection;
uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;
uniform vec3 u_objectColor;
uniform float u_shininess;
uniform float u_opacity;

// Output
out vec4 fragColor;

void main() {
    // Use flat normal from vertex shader (no interpolation)
    vec3 normal = v_normal;

    // Ensure normal faces camera (for double-sided rendering)
    vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);
    if (dot(normal, viewDir) < 0.0) {
        normal = -normal;
    }

    // Light direction (normalized)
    vec3 lightDir = normalize(u_lightDirection);

    // Diffuse lighting
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * u_lightColor;

    // Specular lighting (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), u_shininess);
    vec3 specular = spec * u_lightColor * 0.3;

    // Combine lighting
    vec3 ambient = u_ambientColor;
    vec3 result = (ambient + diffuse + specular) * u_objectColor;

    fragColor = vec4(result, u_opacity);
}
`;

// Simple grid shader
export const gridVertexShader = `#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_color;

uniform mat4 u_viewProjection;

out vec3 v_color;

void main() {
    v_color = a_color;
    gl_Position = u_viewProjection * vec4(a_position, 1.0);
}
`;

export const gridFragmentShader = `#version 300 es
precision highp float;

in vec3 v_color;
out vec4 fragColor;

void main() {
    fragColor = vec4(v_color, 1.0);
}
`;

// Axis helper shader (RGB for XYZ)
export const axisVertexShader = `#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_color;

uniform mat4 u_viewProjection;

out vec3 v_color;

void main() {
    v_color = a_color;
    gl_Position = u_viewProjection * vec4(a_position, 1.0);
}
`;

export const axisFragmentShader = `#version 300 es
precision highp float;

in vec3 v_color;
out vec4 fragColor;

void main() {
    fragColor = vec4(v_color, 1.0);
}
`;

use crate::geometry::Mesh;
use crate::math::Vec3;

/// Create basic text geometry as rectangular blocks
///
/// This is a simple Phase 1 implementation supporting:
/// - Basic Latin characters (A-Z, a-z, 0-9, punctuation)
/// - Left-to-right text direction
/// - Baseline alignment
/// - Size control
///
/// Each character is rendered as a simple rectangle block.
/// This provides 80% of common use cases with minimal complexity.
///
/// Parameters:
/// - text: The text string to render
/// - size: Font size in mm (height of text)
///
/// Returns a mesh with the text in the XY plane at Z=0
pub fn create_text(text: &str, size: f32) -> Mesh {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();
    let mut current_x = 0.0;

    // Simple character rendering using rectangles
    for ch in text.chars() {
        if ch == ' ' {
            current_x += size * 0.3;
            continue;
        }

        // Determine character width based on character type
        let char_width = match ch {
            'i' | 'l' | 'I' | 't' | 'j' | '!' | '.' | ',' | ':' | ';' => size * 0.3,
            'm' | 'M' | 'w' | 'W' => size * 0.9,
            '0'..='9' => size * 0.6,
            _ => size * 0.6, // Default width for most characters
        };

        let char_height = size;

        // Rectangle vertices (counter-clockwise from bottom-left)
        let base_vertex = vertices.len();
        vertices.extend_from_slice(&[
            Vec3::new(current_x, 0.0, 0.0),                      // Bottom-left
            Vec3::new(current_x + char_width, 0.0, 0.0),         // Bottom-right
            Vec3::new(current_x + char_width, char_height, 0.0), // Top-right
            Vec3::new(current_x, char_height, 0.0),              // Top-left
        ]);

        // Rectangle indices (two triangles)
        indices.extend_from_slice(&[
            base_vertex as u32,
            (base_vertex + 1) as u32,
            (base_vertex + 2) as u32,
            base_vertex as u32,
            (base_vertex + 2) as u32,
            (base_vertex + 3) as u32,
        ]);

        // Advance to next character with small spacing
        current_x += char_width + size * 0.05;
    }

    Mesh::new(vertices, indices)
}

/// Create extruded text geometry (3D text with depth)
///
/// This creates 3D text by extruding the 2D text shape along the Z-axis.
///
/// Parameters:
/// - text: The text string to render
/// - size: Font size in mm (height)
/// - depth: Extrusion depth in mm (thickness)
///
/// Returns a 3D mesh with the text geometry
pub fn create_text_3d(text: &str, size: f32, depth: f32) -> Mesh {
    let base_mesh = create_text(text, size);

    if depth <= 0.0 {
        return base_mesh;
    }

    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    // Get base vertices and indices
    let base_vertices = &base_mesh.vertices;
    let base_indices = &base_mesh.indices;

    // Number of original vertices (should be divisible by 4 for rectangles)
    let original_vertex_count = base_vertices.len();

    // Add front face vertices (Z = 0) - same as base
    vertices.extend_from_slice(base_vertices);

    // Add back face vertices (Z = depth) - copy of front face with Z offset
    for vertex in base_vertices {
        vertices.push(Vec3::new(vertex.x, vertex.y, depth));
    }

    // Front face indices (same as base)
    indices.extend_from_slice(base_indices);

    // Back face indices (reverse order for correct winding)
    for i in (0..base_indices.len()).step_by(3) {
        let v0 = base_indices[i] + original_vertex_count as u32;
        let v1 = base_indices[i + 1] + original_vertex_count as u32;
        let v2 = base_indices[i + 2] + original_vertex_count as u32;
        // Reverse order for back face
        indices.extend_from_slice(&[v0, v2, v1]);
    }

    // Side faces (extrude edges)
    // We assume each character is 4 vertices forming a rectangle
    for char_start in (0..original_vertex_count).step_by(4) {
        if char_start + 3 >= original_vertex_count {
            continue;
        }

        // Side vertices (4 corners x 2 faces = 8 vertices per character)
        let side_base = [
            // Front face corners
            char_start,     // bottom-left front
            char_start + 1, // bottom-right front
            char_start + 2, // top-right front
            char_start + 3, // top-left front
            // Back face corners
            char_start + original_vertex_count, // bottom-left back
            char_start + 1 + original_vertex_count, // bottom-right back
            char_start + 2 + original_vertex_count, // top-right back
            char_start + 3 + original_vertex_count, // top-left back
        ];

        // Left side (vertices 0-3-7-4)
        indices.extend_from_slice(&[
            side_base[0] as u32,
            side_base[3] as u32,
            side_base[7] as u32,
            side_base[0] as u32,
            side_base[7] as u32,
            side_base[4] as u32,
        ]);

        // Right side (vertices 1-2-6-5)
        indices.extend_from_slice(&[
            side_base[1] as u32,
            side_base[2] as u32,
            side_base[6] as u32,
            side_base[1] as u32,
            side_base[6] as u32,
            side_base[5] as u32,
        ]);

        // Top side (vertices 3-2-6-7)
        indices.extend_from_slice(&[
            side_base[3] as u32,
            side_base[2] as u32,
            side_base[6] as u32,
            side_base[3] as u32,
            side_base[6] as u32,
            side_base[7] as u32,
        ]);

        // Bottom side (vertices 0-1-5-4)
        indices.extend_from_slice(&[
            side_base[0] as u32,
            side_base[1] as u32,
            side_base[5] as u32,
            side_base[0] as u32,
            side_base[5] as u32,
            side_base[4] as u32,
        ]);
    }

    Mesh::new(vertices, indices)
}

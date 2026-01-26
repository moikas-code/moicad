use crate::geometry::Mesh;
use crate::math::Vec3;
use crate::font_cache::FontCache;
use crate::tessellation;

/// Render text using real TrueType glyphs
fn render_text_with_font(
    text: &str,
    size: f32,
    x_offset: f32,
    y_offset: f32,
    spacing: f32,
) -> (Vec<Vec3>, Vec<u32>) {
    let font_cache = FontCache::get();
    let face = font_cache.default_face();
    
    let mut all_vertices = Vec::new();
    let mut all_indices = Vec::new();
    let mut current_x = 0.0;
    
    for ch in text.chars() {
        // Handle spaces
        if ch == ' ' {
            current_x += size * 0.3 * spacing;
            continue;
        }
        
        // Get glyph ID
        let glyph_id = match font_cache.glyph_id(ch) {
            Some(id) => id,
            None => {
                // Fallback for missing glyphs - use rectangle
                current_x += size * 0.6 * spacing;
                continue;
            }
        };
        
        // Tessellate glyph
        if let Some((mut vertices, mut indices)) = tessellation::tessellate_glyph(face, glyph_id, size) {
            // Offset vertices by current position
            let base_index = all_vertices.len() as u32;
            for vertex in &mut vertices {
                vertex.x += current_x + x_offset;
                vertex.y += y_offset;
            }
            
            // Offset indices
            for index in &mut indices {
                *index += base_index;
            }
            
            all_vertices.extend(vertices);
            all_indices.extend(indices);
        }
        
        // Advance cursor
        let advance = tessellation::glyph_width(face, glyph_id, size);
        current_x += advance + size * 0.05 * spacing;
    }
    
    (all_vertices, all_indices)
}

/// Get character width multiplier based on font style
/// Since we don't have real font rendering, we simulate different fonts
/// by varying character widths and proportions
fn get_font_width_multiplier(font: &str) -> f32 {
    // Parse font name and extract style hints
    let font_lower = font.to_lowercase();
    
    if font_lower.contains("mono") || font_lower.contains("courier") {
        // Monospace fonts - all characters same width
        return 1.0;
    } else if font_lower.contains("condensed") || font_lower.contains("narrow") {
        // Condensed fonts - narrower characters
        return 0.7;
    } else if font_lower.contains("extended") || font_lower.contains("wide") {
        // Extended fonts - wider characters
        return 1.3;
    }
    
    // Default proportional font
    1.0
}

/// Get character width based on character type and font
fn get_char_width(ch: char, size: f32, font: &str) -> f32 {
    let font_lower = font.to_lowercase();
    let base_multiplier = get_font_width_multiplier(font);
    
    // For monospace fonts, all characters have the same width
    if font_lower.contains("mono") || font_lower.contains("courier") {
        return size * 0.6 * base_multiplier;
    }
    
    // For proportional fonts, use character-specific widths
    let char_width = match ch {
        'i' | 'l' | 'I' | 't' | 'j' | '!' | '.' | ',' | ':' | ';' => size * 0.3,
        'm' | 'M' | 'w' | 'W' => size * 0.9,
        '0'..='9' => size * 0.6,
        _ => size * 0.6,
    };
    
    char_width * base_multiplier
}

/// Create text geometry using real TrueType glyphs
///
/// This implementation uses the embedded Liberation Sans font to render
/// actual letter shapes instead of rectangular blocks.
///
/// Parameters:
/// - text: The text string to render
/// - size: Font size in mm (height of text)
///
/// Returns a mesh with the text in the XY plane at Z=0
pub fn create_text(text: &str, size: f32) -> Mesh {
    let (vertices, indices) = render_text_with_font(text, size, 0.0, 0.0, 1.0);
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

/// Calculate the total width of a text string
fn calculate_text_width(text: &str, size: f32, spacing: f32, font: &str) -> f32 {
    let mut total_width = 0.0;
    
    for ch in text.chars() {
        if ch == ' ' {
            total_width += size * 0.3 * spacing;
            continue;
        }
        
        let char_width = get_char_width(ch, size, font);
        total_width += char_width + size * 0.05 * spacing;
    }
    
    // Remove trailing spacing
    if !text.is_empty() {
        total_width -= size * 0.05 * spacing;
    }
    
    total_width
}

/// Create text with alignment, font, and direction support
///
/// Parameters:
/// - text: The text string to render
/// - size: Font size in mm (height of text)
/// - halign: Horizontal alignment ("left", "center", "right")
/// - valign: Vertical alignment ("baseline", "bottom", "center", "top")
/// - spacing: Character spacing multiplier (1.0 = default)
/// - font: Font name (used for width variations)
/// - direction: Text direction ("ltr", "rtl", "ttb", "btt")
pub fn create_text_aligned(
    text: &str,
    size: f32,
    halign: &str,
    valign: &str,
    spacing: f32,
    font: &str,
    direction: &str,
) -> Mesh {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();
    
    // Calculate total width/height for alignment
    let total_width = calculate_text_width(text, size, spacing, font);
    
    // Determine if this is vertical text
    let is_vertical = direction == "ttb" || direction == "btt";
    
    // Calculate horizontal offset
    let h_offset = if !is_vertical {
        match halign {
            "center" => -total_width / 2.0,
            "right" => -total_width,
            _ => 0.0, // "left" or default
        }
    } else {
        // For vertical text, halign affects horizontal position
        match halign {
            "center" => -size / 2.0,
            "right" => -size,
            _ => 0.0,
        }
    };
    
    // Calculate vertical offset
    let v_offset = if !is_vertical {
        match valign {
            "top" => -size,
            "center" => -size / 2.0,
            "bottom" => 0.0,
            _ => 0.0, // "baseline" or default
        }
    } else {
        // For vertical text, valign affects vertical position
        match valign {
            "top" => 0.0,
            "center" => -total_width / 2.0,
            "bottom" => -total_width,
            _ => 0.0,
        }
    };
    
    // Render characters based on direction
    match direction {
        "rtl" => {
            // Right-to-left: reverse text and render from right
            let chars: Vec<char> = text.chars().rev().collect();
            let mut current_x = 0.0;
            
            for ch in chars {
                if ch == ' ' {
                    current_x += size * 0.3 * spacing;
                    continue;
                }
                
                let char_width = get_char_width(ch, size, font);
                let char_height = size;
                
                let base_vertex = vertices.len();
                vertices.extend_from_slice(&[
                    Vec3::new(current_x + h_offset, v_offset, 0.0),
                    Vec3::new(current_x + char_width + h_offset, v_offset, 0.0),
                    Vec3::new(current_x + char_width + h_offset, char_height + v_offset, 0.0),
                    Vec3::new(current_x + h_offset, char_height + v_offset, 0.0),
                ]);
                
                indices.extend_from_slice(&[
                    base_vertex as u32,
                    (base_vertex + 1) as u32,
                    (base_vertex + 2) as u32,
                    base_vertex as u32,
                    (base_vertex + 2) as u32,
                    (base_vertex + 3) as u32,
                ]);
                
                current_x += char_width + size * 0.05 * spacing;
            }
        },
        "ttb" => {
            // Top-to-bottom: render vertically downward
            let mut current_y = 0.0;
            
            for ch in text.chars() {
                if ch == ' ' {
                    current_y -= size * 0.3 * spacing;
                    continue;
                }
                
                let char_width = get_char_width(ch, size, font);
                let char_height = size;
                
                let base_vertex = vertices.len();
                vertices.extend_from_slice(&[
                    Vec3::new(h_offset, current_y + v_offset, 0.0),
                    Vec3::new(char_width + h_offset, current_y + v_offset, 0.0),
                    Vec3::new(char_width + h_offset, current_y - char_height + v_offset, 0.0),
                    Vec3::new(h_offset, current_y - char_height + v_offset, 0.0),
                ]);
                
                indices.extend_from_slice(&[
                    base_vertex as u32,
                    (base_vertex + 1) as u32,
                    (base_vertex + 2) as u32,
                    base_vertex as u32,
                    (base_vertex + 2) as u32,
                    (base_vertex + 3) as u32,
                ]);
                
                current_y -= char_height + size * 0.05 * spacing;
            }
        },
        "btt" => {
            // Bottom-to-top: render vertically upward
            let mut current_y = 0.0;
            
            for ch in text.chars() {
                if ch == ' ' {
                    current_y += size * 0.3 * spacing;
                    continue;
                }
                
                let char_width = get_char_width(ch, size, font);
                let char_height = size;
                
                let base_vertex = vertices.len();
                vertices.extend_from_slice(&[
                    Vec3::new(h_offset, current_y + v_offset, 0.0),
                    Vec3::new(char_width + h_offset, current_y + v_offset, 0.0),
                    Vec3::new(char_width + h_offset, current_y + char_height + v_offset, 0.0),
                    Vec3::new(h_offset, current_y + char_height + v_offset, 0.0),
                ]);
                
                indices.extend_from_slice(&[
                    base_vertex as u32,
                    (base_vertex + 1) as u32,
                    (base_vertex + 2) as u32,
                    base_vertex as u32,
                    (base_vertex + 2) as u32,
                    (base_vertex + 3) as u32,
                ]);
                
                current_y += char_height + size * 0.05 * spacing;
            }
        },
        _ => {
            // Default: left-to-right
            let mut current_x = 0.0;
            
            for ch in text.chars() {
                if ch == ' ' {
                    current_x += size * 0.3 * spacing;
                    continue;
                }
                
                let char_width = get_char_width(ch, size, font);
                let char_height = size;
                
                let base_vertex = vertices.len();
                vertices.extend_from_slice(&[
                    Vec3::new(current_x + h_offset, v_offset, 0.0),
                    Vec3::new(current_x + char_width + h_offset, v_offset, 0.0),
                    Vec3::new(current_x + char_width + h_offset, char_height + v_offset, 0.0),
                    Vec3::new(current_x + h_offset, char_height + v_offset, 0.0),
                ]);
                
                indices.extend_from_slice(&[
                    base_vertex as u32,
                    (base_vertex + 1) as u32,
                    (base_vertex + 2) as u32,
                    base_vertex as u32,
                    (base_vertex + 2) as u32,
                    (base_vertex + 3) as u32,
                ]);
                
                current_x += char_width + size * 0.05 * spacing;
            }
        }
    }
    
    Mesh::new(vertices, indices)
}

/// Create extruded text with alignment, font, and direction support
pub fn create_text_3d_aligned(
    text: &str,
    size: f32,
    depth: f32,
    halign: &str,
    valign: &str,
    spacing: f32,
    font: &str,
    direction: &str,
) -> Mesh {
    let base_mesh = create_text_aligned(text, size, halign, valign, spacing, font, direction);
    
    if depth <= 0.0 {
        return base_mesh;
    }
    
    let mut vertices = Vec::new();
    let mut indices = Vec::new();
    
    let base_vertices = &base_mesh.vertices;
    let base_indices = &base_mesh.indices;
    let original_vertex_count = base_vertices.len();
    
    // Front face
    vertices.extend_from_slice(base_vertices);
    
    // Back face
    for vertex in base_vertices {
        vertices.push(Vec3::new(vertex.x, vertex.y, depth));
    }
    
    // Front face indices
    indices.extend_from_slice(base_indices);
    
    // Back face indices (reversed)
    for i in (0..base_indices.len()).step_by(3) {
        let v0 = base_indices[i] + original_vertex_count as u32;
        let v1 = base_indices[i + 1] + original_vertex_count as u32;
        let v2 = base_indices[i + 2] + original_vertex_count as u32;
        indices.extend_from_slice(&[v0, v2, v1]);
    }
    
    // Side faces
    for char_start in (0..original_vertex_count).step_by(4) {
        if char_start + 3 >= original_vertex_count {
            continue;
        }
        
        let side_base = [
            char_start,
            char_start + 1,
            char_start + 2,
            char_start + 3,
            char_start + original_vertex_count,
            char_start + 1 + original_vertex_count,
            char_start + 2 + original_vertex_count,
            char_start + 3 + original_vertex_count,
        ];
        
        // Left, Right, Top, Bottom sides (same as before)
        indices.extend_from_slice(&[
            side_base[0] as u32, side_base[3] as u32, side_base[7] as u32,
            side_base[0] as u32, side_base[7] as u32, side_base[4] as u32,
        ]);
        
        indices.extend_from_slice(&[
            side_base[1] as u32, side_base[2] as u32, side_base[6] as u32,
            side_base[1] as u32, side_base[6] as u32, side_base[5] as u32,
        ]);
        
        indices.extend_from_slice(&[
            side_base[3] as u32, side_base[2] as u32, side_base[6] as u32,
            side_base[3] as u32, side_base[6] as u32, side_base[7] as u32,
        ]);
        
        indices.extend_from_slice(&[
            side_base[0] as u32, side_base[1] as u32, side_base[5] as u32,
            side_base[0] as u32, side_base[5] as u32, side_base[4] as u32,
        ]);
    }
    
    Mesh::new(vertices, indices)
}


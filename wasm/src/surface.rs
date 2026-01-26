use crate::wasm_bindgen::prelude::*;
use geometry::{Mesh, Vec3};

#[wasm_bindgen]
pub struct SurfaceResult {
    pub vertices: Vec<math::Vec3>,
    pub indices: Vec<u32>,
    pub normals: Vec<math::Vec3>,
}

impl SurfaceResult {
    pub fn new() -> Self {
        Self {
            vertices: Vec::new(),
            indices: Vec::new(),
            normals: Vec::new(),
        }
    }

    pub fn add_vertex(&mut self, x: f32, y: f32, z: f32) {
        self.vertices.push(math::Vec3::new(x, y, z));
    }

    pub fn add_triangle(&mut self, i0: u32, i1: u32, i2: u32) {
        let base_idx = (self.vertices.len() / 3) as u32;
        self.indices.push(base_idx + i0);
        self.indices.push(base_idx + i1);
        self.indices.push(base_idx + i2);
    }

    pub fn calculate_normals(&mut self) {
        self.normals.clear();
        for i in (0..self.indices.len()).step_by(3) {
            let i0 = self.indices[i] as usize;
            let i1 = self.indices[i + 1] as usize;
            let i2 = self.indices[i + 2] as usize;

            // Get vertices
            let v0 = [
                self.vertices[i0 * 3],
                self.vertices[i0 * 3 + 1],
                self.vertices[i0 * 3 + 2],
            ];
            let v1 = [
                self.vertices[i1 * 3],
                self.vertices[i1 * 3 + 1],
                self.vertices[i1 * 3 + 2],
            ];
            let v2 = [
                self.vertices[i2 * 3],
                self.vertices[i2 * 3 + 1],
                self.vertices[i2 * 3 + 2],
            ];

            // Calculate edge vectors
            let edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
            let edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

            // Calculate normal using cross product
            let normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0],
            ];

            // Normalize the normal
            let length =
                (normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]).sqrt();
            if length > 0.0 {
                let normal = [normal[0] / length, normal[1] / length, normal[2] / length];

                self.normals.push(normal[0]);
                self.normals.push(normal[1]);
                self.normals.push(normal[2]);
            }
        }
    }
}

// Core surface creation function
pub fn create_surface(
    width: usize,
    depth: usize,
    data: &[f32],
    center: bool,
    invert: bool,
) -> SurfaceResult {
    let mut result = SurfaceResult::new();

    // Create grid of vertices based on height data
    for y in 0..depth {
        for x in 0..width {
            let idx = y * width + x;
            if idx < data.len() {
                let mut height = data[idx];

                // Apply inversion if needed
                if invert {
                    height = -height;
                }

                // Apply centering offset if needed
                let (final_x, final_y) = if center {
                    (x as f32 - width as f32 / 2.0, y as f32 - depth as f32 / 2.0)
                } else {
                    (x as f32, y as f32)
                };

                result.add_vertex(final_x, final_y, height);
            }
        }
    }

    // Generate triangles for the surface grid
    for y in 0..depth - 1 {
        for x in 0..width - 1 {
            let i00 = y * width + x;
            let i10 = (y + 1) * width + x;
            let i01 = y * width + (x + 1);
            let i11 = (y + 1) * width + (x + 1);

            // Check if all vertices exist
            let vertices_needed = width * depth;
            if i00 < vertices_needed
                && i10 < vertices_needed
                && i01 < vertices_needed
                && i11 < vertices_needed
            {
                result.add_triangle(i00 as u32, i01 as u32, i11 as u32);
                result.add_triangle(i00 as u32, i11 as u32, i10 as u32);
            }
        }
    }

    result.calculate_normals();
    result
}

// Helper function to parse string data
pub fn create_surface_from_string(
    width: usize,
    depth: usize,
    data_str: &str,
    center: bool,
    invert: bool,
) -> SurfaceResult {
    // Parse string data into f32 array
    let mut data = Vec::new();
    let mut current_number = String::new();

    for char in data_str.chars() {
        if char.is_whitespace() || char == '\t' {
            if !current_number.is_empty() {
                if let Ok(num) = current_number.parse::<f32>() {
                    data.push(num);
                }
            }
            current_number.clear();
        } else if char == '-' || char == '.' || char == 'e' || char.is_digit(10) {
            current_number.push(char);
        }
    }

    // Handle last number
    if !current_number.is_empty() {
        if let Ok(num) = current_number.parse::<f32>() {
            data.push(num);
        }
    }

    create_surface(width, depth, &data, center, invert)
}

use crate::math::Vec3;

pub struct SurfaceResult {
    pub vertices: Vec<Vec3>,
    pub indices: Vec<u32>,
    pub normals: Vec<Vec3>,
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
        self.vertices.push(Vec3::new(x, y, z));
    }

    pub fn add_triangle(&mut self, i0: u32, i1: u32, i2: u32) {
        let base_idx = self.vertices.len() as u32;
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

            if i0 < self.vertices.len() && i1 < self.vertices.len() && i2 < self.vertices.len() {
                // Get vertices as Vec3
                let v0 = self.vertices[i0];
                let v1 = self.vertices[i1];
                let v2 = self.vertices[i2];

                // Calculate edge vectors
                let edge1 = v1.subtract(v0);
                let edge2 = v2.subtract(v0);

                // Calculate normal using cross product
                let normal = edge1.cross(edge2);

                // Normalize normal
                let normalized = normal.normalize();
                self.normals.push(normalized);
            }
        }
    }
}

// Core surface creation function
pub fn create_surface(
    _width: usize,
    _depth: usize,
    _data: &[f32],
    _center: bool,
    _invert: bool,
) -> SurfaceResult {
    let mut result = SurfaceResult::new();

    // Simple test: create a 2x2 flat surface regardless of input
    result.add_vertex(0.0, 0.0, 0.0); // (0,0)
    result.add_vertex(1.0, 0.0, 0.0); // (1,0)
    result.add_vertex(0.0, 1.0, 0.0); // (0,1)
    result.add_vertex(1.0, 1.0, 0.0); // (1,1)

    // Create two triangles
    result.add_triangle(0, 1, 2);
    result.add_triangle(1, 3, 2);

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

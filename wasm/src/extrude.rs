use crate::geometry::Mesh;
/// 2D to 3D extrusion operations
use crate::math::Vec3;
use std::f32::consts::PI;

/// Linear extrude a 2D shape along Z axis
pub fn linear_extrude(shape_2d: &Mesh, height: f32, _twist: f32, _scale: f32, slices: u32) -> Mesh {
    if shape_2d.vertices.is_empty() || slices < 1 {
        return Mesh::new(vec![], vec![]);
    }

    let slices = slices.max(1);
    let height_per_slice = height / slices as f32;
    let vertex_count = shape_2d.vertices.len() as u32;

    let mut extruded_vertices = Vec::new();
    let mut extruded_indices = Vec::new();

    // Generate all vertices for all slices (including bottom at z=0)
    for slice in 0..=slices {
        let slice_height = slice as f32 * height_per_slice;
        for vertex in &shape_2d.vertices {
            extruded_vertices.push(Vec3::new(vertex.x, vertex.y, slice_height));
        }
    }

    // Create side faces between consecutive slices
    for slice in 0..slices {
        let current_slice_start = slice * vertex_count;
        let next_slice_start = (slice + 1) * vertex_count;

        for i in 0..vertex_count {
            let next_i = (i + 1) % vertex_count;

            // Two triangles forming a quad between current and next slice
            // Triangle 1: bottom-left, top-left, top-right
            extruded_indices.push(current_slice_start + i);
            extruded_indices.push(next_slice_start + i);
            extruded_indices.push(next_slice_start + next_i);

            // Triangle 2: bottom-left, top-right, bottom-right
            extruded_indices.push(current_slice_start + i);
            extruded_indices.push(next_slice_start + next_i);
            extruded_indices.push(current_slice_start + next_i);
        }
    }

    // Add bottom cap (at z=0, reverse winding for outward normal)
    if vertex_count >= 3 {
        for i in 1..(vertex_count - 1) {
            extruded_indices.push(0);
            extruded_indices.push(i + 1);
            extruded_indices.push(i);
        }
    }

    // Add top cap (at z=height)
    let top_start = slices * vertex_count;
    if vertex_count >= 3 {
        for i in 1..(vertex_count - 1) {
            extruded_indices.push(top_start);
            extruded_indices.push(top_start + i);
            extruded_indices.push(top_start + i + 1);
        }
    }

    let mut mesh = Mesh::new(extruded_vertices, extruded_indices);
    mesh.calculate_normals();
    mesh
}

/// Rotate extrude a 2D shape around Y axis
pub fn rotate_extrude(shape_2d: &Mesh, angle: f32, segments: u32) -> Mesh {
    if shape_2d.vertices.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    let segments = segments.max(3).min(360);
    let angle_per_segment = (angle * PI / 180.0) / segments as f32;
    let full_circle = (angle - 0.001).abs() < 0.001;

    let mut rotated_vertices = Vec::new();
    let mut rotated_indices = Vec::new();

    // For each segment
    for segment in 0..=segments {
        let current_angle = segment as f32 * angle_per_segment;
        let cos_angle = current_angle.cos();
        let sin_angle = current_angle.sin();

        // Add vertices for this segment
        let _start_idx = rotated_vertices.len() as u32;
        for vertex in &shape_2d.vertices {
            let rotated_x = -vertex.x * sin_angle;
            let rotated_z = vertex.x * cos_angle;
            rotated_vertices.push(Vec3::new(rotated_x, vertex.y, rotated_z));
        }

        // Create faces between segments
        if segment > 0 {
            let prev_start = (segment - 1) as u32 * shape_2d.vertices.len() as u32;
            let current_start = segment as u32 * shape_2d.vertices.len() as u32;

            for i in 0..(shape_2d.vertices.len() - 1) {
                let next_i = i + 1;

                rotated_indices.push(prev_start + i as u32);
                rotated_indices.push(prev_start + next_i as u32);
                rotated_indices.push(current_start + next_i as u32);

                rotated_indices.push(current_start + i as u32);
                rotated_indices.push(current_start + i as u32);
                rotated_indices.push(prev_start + i as u32);
            }
        }
    }

    // Close the final segment if it's a full circle
    if full_circle && segments > 0 {
        let first_start = 0;
        let last_start = (segments - 1) as u32 * shape_2d.vertices.len() as u32;

        for i in 0..(shape_2d.vertices.len() - 1) {
            let next_i = i + 1;

            rotated_indices.push(last_start + i as u32);
            rotated_indices.push(last_start + next_i as u32);
            rotated_indices.push(first_start + next_i as u32);

            rotated_indices.push(first_start + i as u32);
            rotated_indices.push(first_start + i as u32);
            rotated_indices.push(last_start + i as u32);
        }
    }

    let mut mesh = Mesh::new(rotated_vertices, rotated_indices);
    mesh.calculate_normals();
    mesh
}

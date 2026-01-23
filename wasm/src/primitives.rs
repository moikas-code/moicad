/// Primitive shape generators for CSG modeling
use crate::geometry::Mesh;
use crate::math::{Vec2, Vec3};
use std::f32::consts::{PI, TAU};

/// Generate a cube centered at origin
pub fn cube(size: f32) -> Mesh {
    let half = size / 2.0;
    let vertices = vec![
        // Front face
        Vec3::new(-half, -half, half),
        Vec3::new(half, -half, half),
        Vec3::new(half, half, half),
        Vec3::new(-half, half, half),
        // Back face
        Vec3::new(-half, -half, -half),
        Vec3::new(-half, half, -half),
        Vec3::new(half, half, -half),
        Vec3::new(half, -half, -half),
    ];

    let indices = vec![
        // Front face
        0, 1, 2, 0, 2, 3, // Back face (fixed: was 4, 6, 5, 4, 7, 6)
        4, 5, 6, 4, 6, 7, // Top face
        3, 2, 6, 3, 6, 5, // Bottom face (fixed: was 4, 1, 0, 4, 7, 1)
        4, 0, 1, 4, 1, 7, // Right face
        1, 7, 6, 1, 6, 2, // Left face
        4, 5, 3, 4, 3, 0,
    ];

    Mesh::new(vertices, indices)
}

/// Generate a sphere with given radius
pub fn sphere(radius: f32, detail: u32) -> Mesh {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    let detail = detail.max(3).min(128);

    // Add north pole
    vertices.push(Vec3::new(0.0, radius, 0.0));

    // Generate rings
    for i in 1..detail {
        let lat = (i as f32 / detail as f32) * PI;
        let sin_lat = lat.sin();
        let cos_lat = lat.cos();

        for j in 0..detail * 2 {
            let lon = (j as f32 / (detail as f32 * 2.0)) * TAU;
            let sin_lon = lon.sin();
            let cos_lon = lon.cos();

            let x = radius * sin_lat * cos_lon;
            let y = radius * cos_lat;
            let z = radius * sin_lat * sin_lon;

            vertices.push(Vec3::new(x, y, z));
        }
    }

    // Add south pole
    vertices.push(Vec3::new(0.0, -radius, 0.0));

    // Build faces
    let rings = detail as u32;
    let verts_per_ring = detail as u32 * 2;

    // North pole faces
    for j in 0..verts_per_ring {
        let next_j = (j + 1) % verts_per_ring;
        indices.push(0);
        indices.push(1 + j as u32);
        indices.push(1 + next_j as u32);
    }

    // Ring faces
    for i in 1..rings - 1 {
        let current_ring_start = 1 + (i - 1) * verts_per_ring;
        let next_ring_start = 1 + i * verts_per_ring;

        for j in 0..verts_per_ring {
            let next_j = (j + 1) % verts_per_ring;

            let v0 = current_ring_start + j;
            let v1 = current_ring_start + next_j;
            let v2 = next_ring_start + j;
            let v3 = next_ring_start + next_j;

            indices.push(v0);
            indices.push(v2);
            indices.push(v1);
            indices.push(v1);
            indices.push(v2);
            indices.push(v3);
        }
    }

    // South pole faces
    let south_pole_idx = vertices.len() as u32 - 1;
    let last_ring_start = 1 + (rings - 2) * verts_per_ring;

    for j in 0..verts_per_ring {
        let next_j = (j + 1) % verts_per_ring;
        indices.push(last_ring_start + next_j);
        indices.push(last_ring_start + j);
        indices.push(south_pole_idx);
    }

    Mesh::new(vertices, indices)
}

/// Generate a cylinder
pub fn cylinder(radius: f32, height: f32, detail: u32) -> Mesh {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    let detail = detail.max(3).min(128);
    let half_h = height / 2.0;

    // Top circle
    for i in 0..detail {
        let angle = (i as f32 / detail as f32) * TAU;
        let x = radius * angle.cos();
        let z = radius * angle.sin();
        vertices.push(Vec3::new(x, half_h, z));
    }

    // Bottom circle
    for i in 0..detail {
        let angle = (i as f32 / detail as f32) * TAU;
        let x = radius * angle.cos();
        let z = radius * angle.sin();
        vertices.push(Vec3::new(x, -half_h, z));
    }

    // Top cap
    let top_center = vertices.len() as u32;
    vertices.push(Vec3::new(0.0, half_h, 0.0));

    for i in 0..detail {
        let next_i = (i + 1) % detail;
        indices.push(top_center);
        indices.push(i as u32);
        indices.push(next_i as u32);
    }

    // Bottom cap
    let bottom_center = vertices.len() as u32;
    vertices.push(Vec3::new(0.0, -half_h, 0.0));

    for i in 0..detail {
        let next_i = (i + 1) % detail;
        let bottom_i = detail + i;
        let bottom_next = detail + next_i;
        indices.push(bottom_center);
        indices.push(bottom_next as u32);
        indices.push(bottom_i as u32);
    }

    // Side faces
    for i in 0..detail {
        let next_i = (i + 1) % detail;
        let top_i = i as u32;
        let top_next = next_i as u32;
        let bottom_i = (detail + i) as u32;
        let bottom_next = (detail + next_i) as u32;

        indices.push(top_i);
        indices.push(bottom_i);
        indices.push(top_next);
        indices.push(top_next);
        indices.push(bottom_i);
        indices.push(bottom_next);
    }

    Mesh::new(vertices, indices)
}

/// Generate a cone
pub fn cone(radius: f32, height: f32, detail: u32) -> Mesh {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    let detail = detail.max(3).min(128);
    let half_h = height / 2.0;

    // Apex
    vertices.push(Vec3::new(0.0, half_h, 0.0));

    // Base circle
    for i in 0..detail {
        let angle = (i as f32 / detail as f32) * TAU;
        let x = radius * angle.cos();
        let z = radius * angle.sin();
        vertices.push(Vec3::new(x, -half_h, z));
    }

    // Base center
    let base_center = vertices.len() as u32;
    vertices.push(Vec3::new(0.0, -half_h, 0.0));

    // Cone sides
    for i in 0..detail {
        let next_i = (i + 1) % detail;
        let apex = 0;
        let base_i = 1 + i as u32;
        let base_next = 1 + next_i as u32;

        indices.push(apex);
        indices.push(base_next);
        indices.push(base_i);
    }

    // Base cap
    for i in 0..detail {
        let next_i = (i + 1) % detail;
        indices.push(base_center);
        indices.push(1 + next_i as u32);
        indices.push(1 + i as u32);
    }

    Mesh::new(vertices, indices)
}

/// Generate a circle (2D shape, extruded to 3D)
pub fn circle(radius: f32, detail: u32) -> Mesh {
    let detail = detail.max(3).min(128);
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    // Center
    vertices.push(Vec3::new(0.0, 0.0, 0.0));

    // Perimeter
    for i in 0..detail {
        let angle = (i as f32 / detail as f32) * TAU;
        let x = radius * angle.cos();
        let y = radius * angle.sin();
        vertices.push(Vec3::new(x, y, 0.0));
    }

    // Triangles from center to perimeter
    for i in 0..detail {
        let next_i = (i + 1) % detail;
        indices.push(0);
        indices.push(1 + i as u32);
        indices.push(1 + next_i as u32);
    }

    Mesh::new(vertices, indices)
}

/// Generate a square
pub fn square(size: f32) -> Mesh {
    let half = size / 2.0;
    let vertices = vec![
        Vec3::new(-half, -half, 0.0),
        Vec3::new(half, -half, 0.0),
        Vec3::new(half, half, 0.0),
        Vec3::new(-half, half, 0.0),
    ];

    let indices = vec![0, 1, 2, 0, 2, 3];

    Mesh::new(vertices, indices)
}

/// Generate a 2D polygon from points with optional paths
pub fn polygon(points: Vec<Vec2>, paths: Option<Vec<Vec<usize>>>) -> Mesh {
    if points.len() < 3 {
        return Mesh::new(vec![], vec![]);
    }

    // Convert 2D points to 3D (z=0)
    let vertices_3d: Vec<Vec3> = points.iter().map(|p| Vec3::new(p.x, p.y, 0.0)).collect();

    let indices;

    if let Some(paths) = paths {
        // Triangulate each path separately
        let mut all_indices = Vec::new();
        for path in paths {
            let path_points: Vec<Vec2> = path.iter().map(|&idx| points[idx]).collect();

            if path_points.len() >= 3 {
                let path_indices = triangulate_earclip(&path_points);
                // Convert local indices to global indices
                let base_idx = all_indices.len() as u32;
                all_indices.extend(path_indices.iter().map(|&i| i + base_idx));
            }
        }
        indices = all_indices;
    } else {
        // Single polygon with all points
        indices = triangulate_earclip(&points);
    }

    Mesh::new(vertices_3d, indices)
}

/// Simple fan triangulation for convex polygons
fn triangulate_earclip(polygon: &[Vec2]) -> Vec<u32> {
    if polygon.len() < 3 {
        return vec![];
    }

    // Simple fan triangulation from first vertex
    let mut indices = Vec::new();
    for i in 1..(polygon.len() - 1) {
        indices.push(0);
        indices.push(i as u32);
        indices.push((i + 1) as u32);
    }
    indices
}

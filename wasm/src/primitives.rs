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

/// Generate a polygon from 2D points using ear-clipping triangulation
pub fn polygon(points: &[Vec2]) -> Mesh {
    if points.len() < 3 {
        // Return empty mesh for invalid polygons
        return Mesh::new(vec![], vec![]);
    }

    // Convert 2D points to 3D vertices (z=0)
    let vertices_3d: Vec<Vec3> = points.iter().map(|p| Vec3::new(p.x, p.y, 0.0)).collect();

    // Triangulate using ear-clipping algorithm
    let indices = ear_clipping_triangulation(points);

    Mesh::new(vertices_3d, indices)
}

/// Ear-clipping triangulation for simple polygons
fn ear_clipping_triangulation(points: &[Vec2]) -> Vec<u32> {
    let n = points.len();
    if n < 3 {
        return vec![];
    }

    // Convert points to mutable list of vertex indices
    let mut vertex_indices: Vec<usize> = (0..n).collect();
    let mut triangles = Vec::new();

    // Helper function to check if point is inside triangle
    fn point_in_triangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2) -> bool {
        let s1 = c.y - a.y;
        let s2 = c.x - a.x;
        let s3 = b.y - a.y;
        let s4 = p.y - a.y;

        let w1 = (a.x * s1 + s4 * s2 - c.x * s4) / (s3 * s2 - s2 * s1);
        let w2 = (s4 - w1 * s3) / s1;

        w1 >= 0.0 && w2 >= 0.0 && (w1 + w2) <= 1.0
    }

    // Helper functions
    let is_convex = |i: usize, indices: &[usize], points: &[Vec2]| {
        let prev = indices[(i + indices.len() - 1) % indices.len()];
        let curr = indices[i];
        let next = indices[(i + 1) % indices.len()];

        let a = points[prev];
        let b = points[curr];
        let c = points[next];

        // Cross product to check if triangle is convex (counter-clockwise)
        (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y) > 0.0
    };

    let is_ear = |i: usize, indices: &[usize], points: &[Vec2]| {
        let prev = indices[(i + indices.len() - 1) % indices.len()];
        let curr = indices[i];
        let next = indices[(i + 1) % indices.len()];

        // Check if any other vertex is inside this triangle
        for (j, &vertex_idx) in indices.iter().enumerate() {
            if vertex_idx == prev || vertex_idx == curr || vertex_idx == next {
                continue;
            }

            if point_in_triangle(points[vertex_idx], points[prev], points[curr], points[next]) {
                return false;
            }
        }
        true
    };

    // Main ear-clipping loop
    while vertex_indices.len() > 3 {
        let mut ear_found = false;

        for i in 0..vertex_indices.len() {
            if is_convex(i, &vertex_indices, points) && is_ear(i, &vertex_indices, points) {
                // Found an ear, clip it
                let prev = vertex_indices[(i + vertex_indices.len() - 1) % vertex_indices.len()];
                let curr = vertex_indices[i];
                let next = vertex_indices[(i + 1) % vertex_indices.len()];

                // Add triangle
                triangles.push(prev as u32);
                triangles.push(curr as u32);
                triangles.push(next as u32);

                // Remove the ear vertex
                vertex_indices.remove(i);
                ear_found = true;
                break;
            }
        }

        if !ear_found {
            // Polygon might be self-intersecting or degenerate
            // Use fan triangulation as fallback
            break;
        }
    }

    // Add the final triangle if we have exactly 3 vertices left
    if vertex_indices.len() == 3 {
        triangles.push(vertex_indices[0] as u32);
        triangles.push(vertex_indices[1] as u32);
        triangles.push(vertex_indices[2] as u32);
    } else if vertex_indices.len() > 3 {
        // Fallback: fan triangulation from first vertex
        let first = vertex_indices[0];
        for i in 1..vertex_indices.len() - 1 {
            triangles.push(first as u32);
            triangles.push(vertex_indices[i] as u32);
            triangles.push(vertex_indices[i + 1] as u32);
        }
    }

    triangles
}

/// Generate a polyhedron from 3D points and face indices
pub fn polyhedron(points: &[Vec3], faces: &[Vec<usize>]) -> Mesh {
    if points.is_empty() || faces.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    // Validate face indices are within range
    for face in faces {
        for &point_idx in face {
            if point_idx >= points.len() {
                return Mesh::new(vec![], vec![]);
            }
        }
    }

    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    // Copy vertices
    vertices.extend_from_slice(points);

    // Triangulate faces
    for face in faces {
        match face.len() {
            3 => {
                // Triangle - add as is
                indices.push(face[0] as u32);
                indices.push(face[1] as u32);
                indices.push(face[2] as u32);
            }
            4 => {
                // Quad - split into two triangles
                indices.push(face[0] as u32);
                indices.push(face[1] as u32);
                indices.push(face[2] as u32);
                indices.push(face[0] as u32);
                indices.push(face[2] as u32);
                indices.push(face[3] as u32);
            }
            n if n > 4 => {
                // N-gon - fan triangulation from first vertex
                for i in 1..(n - 1) {
                    indices.push(face[0] as u32);
                    indices.push(face[i] as u32);
                    indices.push(face[i + 1] as u32);
                }
            }
            _ => {
                // Invalid face (less than 3 vertices)
                continue;
            }
        }
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

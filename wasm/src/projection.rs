/// Projection operations for converting 3D geometry to 2D
use crate::geometry::Mesh;
use crate::math::{Vec2, Vec3};
use std::collections::HashMap;

/// Orthographic projection - creates a "shadow" projection onto the XY plane
/// This considers all points above and below the plane (cut=false behavior)
pub fn project_orthographic(mesh: &Mesh) -> Mesh {
    let mut projected_vertices = Vec::new();
    let mut vertex_map = HashMap::new();

    // Project each 3D vertex to 2D (ignore Z coordinate)
    for (i, vertex) in mesh.vertices.iter().enumerate() {
        let projected_2d = Vec2::new(vertex.x, vertex.y);

        // Check if we already have this 2D point (merge duplicates)
        if let Some(&existing_index) = vertex_map.get(&(projected_2d.x, projected_2d.y)) {
            // Use existing vertex index
            continue;
        } else {
            // Add new projected vertex
            vertex_map.insert((projected_2d.x, projected_2d.y), projected_vertices.len());
            projected_vertices.push(Vec3::new(projected_2d.x, projected_2d.y, 0.0));
        }
    }

    // Create triangles from projected faces
    let mut projected_indices = Vec::new();

    // Process each triangle and project it
    for i in (0..mesh.indices.len()).step_by(3) {
        if i + 2 < mesh.indices.len() {
            let i0 = mesh.indices[i] as usize;
            let i1 = mesh.indices[i + 1] as usize;
            let i2 = mesh.indices[i + 2] as usize;

            if i0 < mesh.vertices.len() && i1 < mesh.vertices.len() && i2 < mesh.vertices.len() {
                let v0 = mesh.vertices[i0];
                let v1 = mesh.vertices[i1];
                let v2 = mesh.vertices[i2];

                // Project vertices to 2D
                let p0 = Vec2::new(v0.x, v0.y);
                let p1 = Vec2::new(v1.x, v1.y);
                let p2 = Vec2::new(v2.x, v2.y);

                // Get mapped indices for projected vertices
                let idx0 = vertex_map[&(p0.x, p0.y)] as u32;
                let idx1 = vertex_map[&(p1.x, p1.y)] as u32;
                let idx2 = vertex_map[&(p2.x, p2.y)] as u32;

                // Only add triangle if it's not degenerate (has area)
                if !is_degenerate_triangle_2d(p0, p1, p2) {
                    projected_indices.push(idx0);
                    projected_indices.push(idx1);
                    projected_indices.push(idx2);
                }
            }
        }
    }

    // Create 2D mesh (all vertices have Z=0)
    Mesh::new(projected_vertices, projected_indices)
}

/// Slice projection - creates a 2D slice of the object at Z=0 plane
/// This only considers points with z=0 (cut=true behavior)
pub fn project_slice(mesh: &Mesh) -> Mesh {
    let mut slice_edges = Vec::new();
    let tolerance = 1e-6;

    // Find all edges that intersect the Z=0 plane
    for i in (0..mesh.indices.len()).step_by(3) {
        if i + 2 < mesh.indices.len() {
            let i0 = mesh.indices[i] as usize;
            let i1 = mesh.indices[i + 1] as usize;
            let i2 = mesh.indices[i + 2] as usize;

            if i0 < mesh.vertices.len() && i1 < mesh.vertices.len() && i2 < mesh.vertices.len() {
                let v0 = mesh.vertices[i0];
                let v1 = mesh.vertices[i1];
                let v2 = mesh.vertices[i2];

                // Check each edge of the triangle for intersection with Z=0 plane
                let edges = [(v0, v1), (v1, v2), (v2, v0)];

                for (start, end) in edges {
                    if let Some(intersection) = line_intersect_z_plane(start, end, 0.0, tolerance) {
                        slice_edges.push(intersection);
                    }
                }
            }
        }
    }

    // Sort edges into contours and create polygon
    let contours = trace_contours(slice_edges);

    // Triangulate the contours to create mesh
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    for contour in &contours {
        let base_index = vertices.len();

        // Add contour vertices
        for point in contour {
            vertices.push(Vec3::new(point.x, point.y, 0.0));
        }

        // Triangulate contour (fan triangulation for simple polygons)
        if contour.len() >= 3 {
            for i in 1..contour.len() - 1 {
                indices.push(base_index as u32);
                indices.push((base_index + i) as u32);
                indices.push((base_index + i + 1) as u32);
            }
        }
    }

    if vertices.is_empty() {
        // Return empty mesh if no intersection found
        return Mesh::new(Vec::new(), Vec::new());
    }

    Mesh::new(vertices, indices)
}

/// Check if a triangle is degenerate (has zero area) in 2D
fn is_degenerate_triangle_2d(p1: Vec2, p2: Vec2, p3: Vec2) -> bool {
    // Calculate 2D cross product to determine if points are collinear
    let cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    cross.abs() < 1e-10
}

/// Find intersection of a line segment with a horizontal plane at z=plane_z
fn line_intersect_z_plane(start: Vec3, end: Vec3, plane_z: f32, tolerance: f32) -> Option<Vec2> {
    // Check if the segment crosses the plane
    let (z1, z2) = (start.z, end.z);

    // Both points on the same side of the plane
    if (z1 - plane_z) * (z2 - plane_z) > tolerance {
        return None;
    }

    // Both points exactly on the plane (edge lies in plane)
    if (z1 - plane_z).abs() < tolerance && (z2 - plane_z).abs() < tolerance {
        return None; // We'll handle this case differently
    }

    // One point on the plane, other not
    if (z1 - plane_z).abs() < tolerance {
        return Some(Vec2::new(start.x, start.y));
    }
    if (z2 - plane_z).abs() < tolerance {
        return Some(Vec2::new(end.x, end.y));
    }

    // Segment crosses the plane - interpolate intersection point
    let t = (plane_z - z1) / (z2 - z1);
    if t >= 0.0 && t <= 1.0 {
        let x = start.x + t * (end.x - start.x);
        let y = start.y + t * (end.y - start.y);
        Some(Vec2::new(x, y))
    } else {
        None
    }
}

/// Trace connected edges into closed contours
fn trace_contours(edges: Vec<Vec2>) -> Vec<Vec<Vec2>> {
    let mut contours = Vec::new();
    let mut used_edges = vec![false; edges.len()];

    for i in 0..edges.len() {
        if used_edges[i] {
            continue;
        }

        // Start a new contour
        let mut contour = Vec::new();
        let mut current_point = edges[i];
        contour.push(current_point);
        used_edges[i] = true;

        // Try to connect to next edge
        loop {
            let mut found_next = false;

            for j in 0..edges.len() {
                if used_edges[j] {
                    continue;
                }

                // Check if this edge connects to current point (within tolerance)
                let dist = (edges[j].x - current_point.x).hypot(edges[j].y - current_point.y);
                if dist < 1e-6 {
                    current_point = edges[j];
                    contour.push(current_point);
                    used_edges[j] = true;
                    found_next = true;
                    break;
                }
            }

            if !found_next {
                break;
            }

            // Check if we've closed the loop
            if contour.len() > 2 {
                let first = contour[0];
                let dist = (first.x - current_point.x).hypot(first.y - current_point.y);
                if dist < 1e-6 {
                    // Closed the loop
                    break;
                }
            }
        }

        if contour.len() >= 3 {
            contours.push(contour);
        }
    }

    contours
}

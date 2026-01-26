// 2D geometry operations: offset, resize, etc.

use crate::geometry::Mesh;
use crate::math::{Vec2, Vec3};

/// Perform polygon offset/inset operation
/// Positive delta expands (outset), negative delta contracts (inset)
/// Chamfer determines whether to add chamfer corners for sharp angles
pub fn offset_polygon(vertices: &[Vec3], delta: f32, chamfer: bool) -> Mesh {
    if vertices.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    // Extract 2D vertices (assuming all vertices have Z=0)
    let points_2d: Vec<Vec2> = vertices.iter().map(|v| Vec2::new(v.x, v.y)).collect();

    let offset_points = if delta >= 0.0 {
        offset_outset(&points_2d, delta, chamfer)
    } else {
        offset_inset(&points_2d, -delta, chamfer)
    };

    // Convert back to 3D with Z=0
    let _offset_vertices: Vec<Vec3> = offset_points
        .iter()
        .map(|p| Vec3::new(p.x, p.y, 0.0))
        .collect();

    // Triangulate using ear clipping algorithm
    crate::primitives::polygon(&offset_points)
}

/// Outset polygon (expand outward)
fn offset_outset(points: &[Vec2], delta: f32, chamfer: bool) -> Vec<Vec2> {
    if points.len() < 2 {
        return points.to_vec();
    }

    let mut result = Vec::new();
    let n = points.len();

    for i in 0..n {
        let prev = points[(i + n - 1) % n];
        let curr = points[i];
        let next = points[(i + 1) % n];

        // Calculate outward normal for each edge
        let edge1 = curr - prev;
        let edge2 = next - curr;

        // Perpendicular vectors pointing outward
        let normal1 = Vec2::new(-edge1.y, edge1.x).normalize();
        let normal2 = Vec2::new(-edge2.y, edge2.x).normalize();

        // Average normal for vertex
        let avg_normal = (normal1 + normal2).normalize();

        // Project vertex outward
        let offset_vertex = curr + avg_normal.scale(delta);

        if chamfer {
            // Add chamfer corners
            let corner1 = curr + normal1.scale(delta);
            let corner2 = curr + normal2.scale(delta);

            result.push(corner1);
            result.push(offset_vertex);
            result.push(corner2);
        } else {
            // Miter corner
            result.push(offset_vertex);
        }
    }

    result
}

/// Inset polygon (contract inward)
fn offset_inset(points: &[Vec2], delta: f32, chamfer: bool) -> Vec<Vec2> {
    if points.len() < 3 {
        return vec![];
    }

    let mut result = Vec::new();
    let n = points.len();

    for i in 0..n {
        let prev = points[(i + n - 1) % n];
        let curr = points[i];
        let next = points[(i + 1) % n];

        // Calculate inward normal for each edge
        let edge1 = curr - prev;
        let edge2 = next - curr;

        // Perpendicular vectors pointing inward
        let normal1 = Vec2::new(edge1.y, -edge1.x).normalize();
        let normal2 = Vec2::new(edge2.y, -edge2.x).normalize();

        // Average normal for vertex
        let avg_normal = (normal1 + normal2).normalize();

        // Check if offset would cause self-intersection
        let offset_vertex = curr + avg_normal.scale(delta);

        // Simple intersection check - if offset is too large, skip
        if is_valid_inset_point(&offset_vertex, points, delta) {
            if chamfer {
                let corner1 = curr + normal1.scale(delta);
                let corner2 = curr + normal2.scale(delta);

                if is_valid_inset_point(&corner1, points, delta) {
                    result.push(corner1);
                }
                result.push(offset_vertex);
                if is_valid_inset_point(&corner2, points, delta) {
                    result.push(corner2);
                }
            } else {
                result.push(offset_vertex);
            }
        }
    }

    // Filter out invalid self-intersections
    if result.len() < 3 {
        return vec![];
    }

    result
}

/// Check if an inset point would cause self-intersection
fn is_valid_inset_point(point: &Vec2, original: &[Vec2], _delta: f32) -> bool {
    // Only reject points that are clearly invalid (crossed through to wrong side)
    // Valid inset points should be approximately delta away from edges, which is correct
    // Use small epsilon for numerical stability instead of delta-based threshold
    for edge in original.windows(2) {
        if edge.len() == 2 {
            let dist_to_edge = point_to_line_distance(point, &edge[0], &edge[1]);
            if dist_to_edge < 0.001 {  // Small epsilon to catch numerical errors only
                return false;
            }
        }
    }
    true
}

/// Calculate distance from point to line segment
fn point_to_line_distance(point: &Vec2, line_start: &Vec2, line_end: &Vec2) -> f32 {
    let line_vec = *line_end - *line_start;
    let point_vec = *point - *line_start;

    let t = point_vec.dot(line_vec) / line_vec.dot(line_vec).max(1e-6);
    let t_clamped = t.clamp(0.0, 1.0);

    let closest_point = *line_start + line_vec.scale(t_clamped);
    (*point - closest_point).length()
}

/// Resize 2D shape to specific dimensions
/// new_size: [width, height]
/// auto: if true, scales uniformly to fit max dimension
pub fn resize_2d(vertices: &[Vec3], new_size: [f32; 2], auto: bool) -> Mesh {
    if vertices.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    // Calculate current bounds
    let mut min_x = f32::INFINITY;
    let mut max_x = f32::NEG_INFINITY;
    let mut min_y = f32::INFINITY;
    let mut max_y = f32::NEG_INFINITY;

    for vertex in vertices {
        min_x = min_x.min(vertex.x);
        max_x = max_x.max(vertex.x);
        min_y = min_y.min(vertex.y);
        max_y = max_y.max(vertex.y);
    }

    let current_width = max_x - min_x;
    let current_height = max_y - min_y;

    if current_width <= 0.0 || current_height <= 0.0 {
        return Mesh::new(vertices.to_vec(), vec![]);
    }

    // Calculate scale factors
    let (scale_x, scale_y) = if auto {
        let scale = (new_size[0] / current_width).min(new_size[1] / current_height);
        (scale, scale)
    } else {
        (new_size[0] / current_width, new_size[1] / current_height)
    };

    // Apply scaling around center
    let center_x = (min_x + max_x) / 2.0;
    let center_y = (min_y + max_y) / 2.0;

    let resized_vertices: Vec<Vec3> = vertices
        .iter()
        .map(|v| {
            let x = center_x + (v.x - center_x) * scale_x;
            let y = center_y + (v.y - center_y) * scale_y;
            Vec3::new(x, y, v.z) // Preserve Z coordinate
        })
        .collect();

    // Copy original triangulation if available
    // For now, create a simple triangulation
    let points_2d: Vec<Vec2> = resized_vertices
        .iter()
        .map(|v| Vec2::new(v.x, v.y))
        .collect();

    crate::primitives::polygon(&points_2d)
}

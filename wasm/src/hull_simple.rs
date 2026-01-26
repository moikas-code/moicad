/// Simple incremental 3D convex hull
use crate::geometry::Mesh;
use crate::math::Vec3;

const EPSILON: f32 = 1e-6;

pub fn simple_hull(points: &[Vec3]) -> Option<Mesh> {
    if points.len() < 4 {
        return None;
    }
    
    // Find 4 initial points
    let (v0, v1, v2, v3) = find_tetrahedron(points)?;
    
    // Just return the tetrahedron for now to test
    let mut vertices = Vec::new();
    let mut indices = Vec::new();
    
    // Add 4 faces of tetrahedron
    add_triangle(&mut vertices, &mut indices, points[v0], points[v1], points[v2]);
    add_triangle(&mut vertices, &mut indices, points[v0], points[v3], points[v1]);
    add_triangle(&mut vertices, &mut indices, points[v0], points[v2], points[v3]);
    add_triangle(&mut vertices, &mut indices, points[v1], points[v3], points[v2]);
    
    Some(Mesh::new(vertices, indices))
}

fn add_triangle(vertices: &mut Vec<Vec3>, indices: &mut Vec<u32>, p0: Vec3, p1: Vec3, p2: Vec3) {
    let base = vertices.len() as u32;
    vertices.push(p0);
    vertices.push(p1);
    vertices.push(p2);
    indices.push(base);
    indices.push(base + 1);
    indices.push(base + 2);
}

fn find_tetrahedron(points: &[Vec3]) -> Option<(usize, usize, usize, usize)> {
    if points.len() < 4 {
        return None;
    }
    
    // Find extremes
    let mut min_x = 0;
    let mut max_x = 0;
    for (i, p) in points.iter().enumerate() {
        if p.x < points[min_x].x { min_x = i; }
        if p.x > points[max_x].x { max_x = i; }
    }
    
    if min_x == max_x {
        return None;
    }
    
    // Find third point farthest from line
    let line_dir = points[max_x].subtract(points[min_x]).normalize();
    let mut third = 0;
    let mut max_dist = 0.0;
    
    for (i, p) in points.iter().enumerate() {
        if i == min_x || i == max_x { continue; }
        let to_p = p.subtract(points[min_x]);
        let proj = line_dir.scale(to_p.dot(line_dir));
        let perp = to_p.subtract(proj);
        let dist = perp.length();
        if dist > max_dist {
            max_dist = dist;
            third = i;
        }
    }
    
    if max_dist < EPSILON {
        return None;
    }
    
    // Find fourth point farthest from plane
    let normal = points[max_x].subtract(points[min_x])
        .cross(points[third].subtract(points[min_x])).normalize();
    
    let mut fourth = 0;
    let mut max_plane_dist = 0.0;
    
    for (i, p) in points.iter().enumerate() {
        if i == min_x || i == max_x || i == third { continue; }
        let to_p = p.subtract(points[min_x]);
        let dist = to_p.dot(normal).abs();
        if dist > max_plane_dist {
            max_plane_dist = dist;
            fourth = i;
        }
    }
    
    if max_plane_dist < EPSILON {
        return None;
    }
    
    Some((min_x, max_x, third, fourth))
}

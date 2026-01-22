/// Convex Hull operations for CSG modeling
/// Implements 3D convex hull using quickhull algorithm

use crate::geometry::Mesh;
use crate::math::Vec3;

const EPSILON: f32 = 1e-6;

/// Compute the convex hull of a mesh
pub fn compute_hull(mesh: &Mesh) -> Mesh {
    if mesh.vertices.len() < 4 {
        return mesh.clone();
    }

    // Get unique points
    let points: Vec<Vec3> = dedup_points(&mesh.vertices);

    if points.len() < 4 {
        return mesh.clone();
    }

    // Use quickhull algorithm
    match quickhull(&points) {
        Some(hull_mesh) => hull_mesh,
        None => mesh.clone(),
    }
}

/// Remove duplicate points
fn dedup_points(points: &[Vec3]) -> Vec<Vec3> {
    let mut result = Vec::new();
    for p in points {
        let exists = result.iter().any(|r: &Vec3| {
            (r.x - p.x).abs() < EPSILON
                && (r.y - p.y).abs() < EPSILON
                && (r.z - p.z).abs() < EPSILON
        });
        if !exists {
            result.push(*p);
        }
    }
    result
}

/// Find the extreme points to form initial tetrahedron
fn find_initial_tetrahedron(points: &[Vec3]) -> Option<[usize; 4]> {
    if points.len() < 4 {
        return None;
    }

    // Find min/max X points
    let mut min_x_idx = 0;
    let mut max_x_idx = 0;
    for (i, p) in points.iter().enumerate() {
        if p.x < points[min_x_idx].x {
            min_x_idx = i;
        }
        if p.x > points[max_x_idx].x {
            max_x_idx = i;
        }
    }

    if min_x_idx == max_x_idx {
        // All points have same X, try Y
        for (i, p) in points.iter().enumerate() {
            if p.y < points[min_x_idx].y {
                min_x_idx = i;
            }
            if p.y > points[max_x_idx].y {
                max_x_idx = i;
            }
        }
    }

    // Find point farthest from line
    let line_dir = points[max_x_idx].subtract(points[min_x_idx]).normalize();
    let mut max_dist = 0.0;
    let mut third_idx = 0;

    for (i, p) in points.iter().enumerate() {
        if i == min_x_idx || i == max_x_idx {
            continue;
        }
        let to_point = p.subtract(points[min_x_idx]);
        let proj_len = to_point.dot(line_dir);
        let proj = line_dir.scale(proj_len);
        let perp = to_point.subtract(proj);
        let dist = perp.length();
        if dist > max_dist {
            max_dist = dist;
            third_idx = i;
        }
    }

    if max_dist < EPSILON {
        return None; // Collinear points
    }

    // Find point farthest from plane formed by first three points
    let v0 = points[min_x_idx];
    let v1 = points[max_x_idx];
    let v2 = points[third_idx];
    let normal = v1.subtract(v0).cross(v2.subtract(v0)).normalize();
    let d = normal.dot(v0);

    let mut max_plane_dist = 0.0;
    let mut fourth_idx = 0;

    for (i, p) in points.iter().enumerate() {
        if i == min_x_idx || i == max_x_idx || i == third_idx {
            continue;
        }
        let dist = (normal.dot(*p) - d).abs();
        if dist > max_plane_dist {
            max_plane_dist = dist;
            fourth_idx = i;
        }
    }

    if max_plane_dist < EPSILON {
        return None; // Coplanar points
    }

    Some([min_x_idx, max_x_idx, third_idx, fourth_idx])
}

/// Half-edge face for quickhull
#[derive(Clone)]
struct HullFace {
    vertices: [usize; 3],
    normal: Vec3,
    distance: f32,
    visible_points: Vec<usize>,
}

impl HullFace {
    fn new(v0: usize, v1: usize, v2: usize, points: &[Vec3]) -> Self {
        let p0 = points[v0];
        let p1 = points[v1];
        let p2 = points[v2];
        let normal = p1.subtract(p0).cross(p2.subtract(p0)).normalize();
        let distance = normal.dot(p0);

        HullFace {
            vertices: [v0, v1, v2],
            normal,
            distance,
            visible_points: Vec::new(),
        }
    }

    fn signed_distance(&self, point: Vec3) -> f32 {
        self.normal.dot(point) - self.distance
    }
}

/// Quickhull algorithm
fn quickhull(points: &[Vec3]) -> Option<Mesh> {
    // Find initial tetrahedron
    let initial = find_initial_tetrahedron(points)?;
    let [i0, i1, i2, i3] = initial;

    // Create initial faces (4 triangles of tetrahedron)
    let center = points[i0]
        .add(points[i1])
        .add(points[i2])
        .add(points[i3])
        .scale(0.25);

    let mut faces = Vec::new();

    // Create faces with proper winding (normals pointing outward)
    let face_indices = [
        [i0, i1, i2],
        [i0, i2, i3],
        [i0, i3, i1],
        [i1, i3, i2],
    ];

    for [a, b, c] in face_indices {
        let mut face = HullFace::new(a, b, c, points);
        // Check if normal points away from center
        let face_center = points[a].add(points[b]).add(points[c]).scale(1.0 / 3.0);
        if face.normal.dot(face_center.subtract(center)) < 0.0 {
            // Flip face
            face = HullFace::new(a, c, b, points);
        }
        faces.push(face);
    }

    // Assign remaining points to faces
    for (i, p) in points.iter().enumerate() {
        if i == i0 || i == i1 || i == i2 || i == i3 {
            continue;
        }
        for face in &mut faces {
            if face.signed_distance(*p) > EPSILON {
                face.visible_points.push(i);
                break;
            }
        }
    }

    // Process faces with visible points
    let mut iteration = 0;
    let max_iterations = points.len() * 10;

    while iteration < max_iterations {
        iteration += 1;

        // Find face with farthest visible point
        let mut best_face_idx = None;
        let mut best_point_idx = None;
        let mut max_dist = EPSILON;

        for (fi, face) in faces.iter().enumerate() {
            for &pi in &face.visible_points {
                let dist = face.signed_distance(points[pi]);
                if dist > max_dist {
                    max_dist = dist;
                    best_face_idx = Some(fi);
                    best_point_idx = Some(pi);
                }
            }
        }

        let (face_idx, point_idx) = match (best_face_idx, best_point_idx) {
            (Some(f), Some(p)) => (f, p),
            _ => break, // No more points to process
        };

        let apex = point_idx;

        // Find all faces visible from this point
        let mut visible_faces = Vec::new();
        for (i, face) in faces.iter().enumerate() {
            if face.signed_distance(points[apex]) > EPSILON {
                visible_faces.push(i);
            }
        }

        // Find horizon edges (edges shared by exactly one visible face)
        let mut horizon_edges: Vec<(usize, usize)> = Vec::new();
        for &fi in &visible_faces {
            let face = &faces[fi];
            for edge_i in 0..3 {
                let e0 = face.vertices[edge_i];
                let e1 = face.vertices[(edge_i + 1) % 3];

                // Check if this edge is shared with another visible face
                let mut shared = false;
                for &other_fi in &visible_faces {
                    if other_fi == fi {
                        continue;
                    }
                    let other_face = &faces[other_fi];
                    for other_edge_i in 0..3 {
                        let oe0 = other_face.vertices[other_edge_i];
                        let oe1 = other_face.vertices[(other_edge_i + 1) % 3];
                        if (e0 == oe1 && e1 == oe0) || (e0 == oe0 && e1 == oe1) {
                            shared = true;
                            break;
                        }
                    }
                    if shared {
                        break;
                    }
                }

                if !shared {
                    horizon_edges.push((e0, e1));
                }
            }
        }

        // Collect orphaned points from visible faces
        let mut orphaned_points = Vec::new();
        for &fi in &visible_faces {
            for &pi in &faces[fi].visible_points {
                if pi != apex {
                    orphaned_points.push(pi);
                }
            }
        }

        // Remove visible faces (in reverse order to preserve indices)
        let mut visible_sorted = visible_faces.clone();
        visible_sorted.sort_by(|a, b| b.cmp(a));
        for fi in visible_sorted {
            faces.remove(fi);
        }

        // Create new faces from horizon edges to apex
        for (e0, e1) in horizon_edges {
            let mut new_face = HullFace::new(e0, e1, apex, points);

            // Check winding - normal should point away from interior
            let face_center = points[e0].add(points[e1]).add(points[apex]).scale(1.0 / 3.0);

            // Find a point that's definitely inside (use original tetrahedron center)
            if new_face.signed_distance(center) > 0.0 {
                // Flip the face
                new_face = HullFace::new(e1, e0, apex, points);
            }

            faces.push(new_face);
        }

        // Reassign orphaned points to new faces
        for pi in orphaned_points {
            for face in &mut faces {
                if face.signed_distance(points[pi]) > EPSILON {
                    face.visible_points.push(pi);
                    break;
                }
            }
        }
    }

    // Convert faces to mesh
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    for face in &faces {
        let base_idx = vertices.len() as u32;
        vertices.push(points[face.vertices[0]]);
        vertices.push(points[face.vertices[1]]);
        vertices.push(points[face.vertices[2]]);
        indices.push(base_idx);
        indices.push(base_idx + 1);
        indices.push(base_idx + 2);
    }

    Some(Mesh::new(vertices, indices))
}

/// Compute hull of multiple meshes
pub fn hull_meshes(meshes: &[&Mesh]) -> Mesh {
    // Collect all vertices from all meshes
    let mut all_vertices = Vec::new();
    for mesh in meshes {
        all_vertices.extend_from_slice(&mesh.vertices);
    }

    if all_vertices.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    compute_hull(&Mesh::new(all_vertices, vec![]))
}

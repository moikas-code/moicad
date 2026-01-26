/// Convex Hull operations for CSG modeling
/// Implements 3D convex hull using Randomized Incremental algorithm
/// with robust numerical handling for coplanar point sets
use crate::geometry::Mesh;
use crate::math::Vec3;
use std::collections::{HashMap, HashSet};

// Multi-level epsilon constants for different comparison needs
const EPSILON_TIGHT: f32 = 1e-7;    // For exact/degenerate triangle detection
const EPSILON_LOOSE: f32 = 1e-4;    // For coplanar detection
const EPSILON_GRID: f32 = 1e-5;     // For spatial hashing deduplication

// ============================================================================
// Phase 1: Numerical Robustness Infrastructure
// ============================================================================

/// Quantize a point to grid cell for spatial hashing (O(1) lookup)
#[inline]
fn quantize_point(v: Vec3) -> (i64, i64, i64) {
    (
        (v.x / EPSILON_GRID).round() as i64,
        (v.y / EPSILON_GRID).round() as i64,
        (v.z / EPSILON_GRID).round() as i64,
    )
}

/// Compute adaptive epsilon based on coordinate magnitudes
/// Larger coordinates need larger epsilon for numerical stability
#[inline]
fn adaptive_epsilon(points: &[Vec3]) -> f32 {
    let max_coord = points.iter()
        .flat_map(|v| [v.x.abs(), v.y.abs(), v.z.abs()])
        .fold(0.0f32, |acc, x| acc.max(x));
    EPSILON_LOOSE * max_coord.max(1.0)
}

/// Robust signed distance from point to plane with adaptive epsilon
/// Returns (distance, is_on_plane)
#[inline]
fn signed_distance_robust(point: Vec3, plane_point: Vec3, plane_normal: Vec3, eps: f32) -> (f32, bool) {
    let dist = plane_normal.dot(point.subtract(plane_point));
    let is_on_plane = dist.abs() < eps;
    (dist, is_on_plane)
}

/// Remove duplicate points using spatial hashing - O(n) instead of O(n²)
fn dedup_points(points: &[Vec3]) -> Vec<Vec3> {
    let mut seen: HashSet<(i64, i64, i64)> = HashSet::with_capacity(points.len());
    let mut result = Vec::with_capacity(points.len());

    for p in points {
        let key = quantize_point(*p);
        if seen.insert(key) {
            result.push(*p);
        }
    }
    result
}

// ============================================================================
// Phase 2: Core Data Structures
// ============================================================================

/// Face with conflict list for incremental algorithm
#[derive(Clone, Debug)]
struct ConflictFace {
    vertices: [usize; 3],
    normal: Vec3,
    center: Vec3,
    conflict_points: Vec<usize>,  // Points that can "see" this face
    is_visible: bool,             // Marked during horizon finding
}

impl ConflictFace {
    /// Create a new face, returning None if degenerate (zero area)
    fn new(v0: usize, v1: usize, v2: usize, points: &[Vec3]) -> Option<Self> {
        let p0 = points[v0];
        let p1 = points[v1];
        let p2 = points[v2];

        let edge1 = p1.subtract(p0);
        let edge2 = p2.subtract(p0);
        let cross = edge1.cross(edge2);
        let len = cross.length();

        // Reject degenerate triangles (near-zero area)
        if len < EPSILON_TIGHT {
            return None;
        }

        let normal = cross.scale(1.0 / len);
        let center = p0.add(p1).add(p2).scale(1.0 / 3.0);

        Some(ConflictFace {
            vertices: [v0, v1, v2],
            normal,
            center,
            conflict_points: Vec::new(),
            is_visible: false,
        })
    }

    /// Create face with flipped winding (reversed normal)
    fn new_flipped(v0: usize, v1: usize, v2: usize, points: &[Vec3]) -> Option<Self> {
        Self::new(v0, v2, v1, points)
    }

    /// Check if point can see this face (is on positive/outside side)
    #[inline]
    fn point_visible(&self, point: Vec3, eps: f32) -> bool {
        let (dist, on_plane) = signed_distance_robust(point, self.center, self.normal, eps);
        !on_plane && dist > 0.0
    }

    /// Get signed distance from point to face plane
    #[inline]
    fn signed_distance(&self, point: Vec3) -> f32 {
        self.normal.dot(point.subtract(self.center))
    }

    /// Get edge by index (0, 1, or 2)
    #[inline]
    fn edge(&self, idx: usize) -> (usize, usize) {
        match idx {
            0 => (self.vertices[0], self.vertices[1]),
            1 => (self.vertices[1], self.vertices[2]),
            2 => (self.vertices[2], self.vertices[0]),
            _ => panic!("Invalid edge index"),
        }
    }
}

/// Canonical edge representation for hashing
#[derive(Clone, Copy, Debug, Hash, Eq, PartialEq)]
struct Edge(usize, usize);

impl Edge {
    fn new(a: usize, b: usize) -> Self {
        if a < b { Edge(a, b) } else { Edge(b, a) }
    }
}

// ============================================================================
// Phase 2: Initial Tetrahedron Construction
// ============================================================================

/// Find index of point with minimum X coordinate
fn find_min_x(points: &[Vec3]) -> usize {
    points.iter().enumerate()
        .min_by(|(_, a), (_, b)| a.x.partial_cmp(&b.x).unwrap())
        .map(|(i, _)| i)
        .unwrap_or(0)
}

/// Find index of point with maximum X coordinate
fn find_max_x(points: &[Vec3]) -> usize {
    points.iter().enumerate()
        .max_by(|(_, a), (_, b)| a.x.partial_cmp(&b.x).unwrap())
        .map(|(i, _)| i)
        .unwrap_or(0)
}

/// Find point farthest from a line defined by two points
fn find_point_farthest_from_line(points: &[Vec3], v0: usize, v1: usize, eps: f32) -> Option<usize> {
    let p0 = points[v0];
    let p1 = points[v1];
    let line_dir = p1.subtract(p0);
    let line_len = line_dir.length();

    if line_len < EPSILON_TIGHT {
        return None;
    }

    let line_dir = line_dir.scale(1.0 / line_len);

    let mut best_idx = None;
    let mut best_dist = eps;

    for (i, p) in points.iter().enumerate() {
        if i == v0 || i == v1 { continue; }

        let to_point = p.subtract(p0);
        let proj_len = to_point.dot(line_dir);
        let proj = line_dir.scale(proj_len);
        let perp = to_point.subtract(proj);
        let dist = perp.length();

        if dist > best_dist {
            best_dist = dist;
            best_idx = Some(i);
        }
    }

    best_idx
}

/// Find point farthest from a plane defined by three points
fn find_point_farthest_from_plane(points: &[Vec3], v0: usize, v1: usize, v2: usize, eps: f32) -> Option<usize> {
    let p0 = points[v0];
    let p1 = points[v1];
    let p2 = points[v2];

    let edge1 = p1.subtract(p0);
    let edge2 = p2.subtract(p0);
    let normal = edge1.cross(edge2);
    let len = normal.length();

    if len < EPSILON_TIGHT {
        return None;  // Collinear points
    }

    let normal = normal.scale(1.0 / len);

    let mut best_idx = None;
    let mut best_dist = eps;

    for (i, p) in points.iter().enumerate() {
        if i == v0 || i == v1 || i == v2 { continue; }

        let dist = normal.dot(p.subtract(p0)).abs();

        if dist > best_dist {
            best_dist = dist;
            best_idx = Some(i);
        }
    }

    best_idx
}

/// Build initial tetrahedron from 4 non-coplanar points
fn build_initial_tetrahedron(points: &[Vec3], eps: f32) -> Option<Vec<ConflictFace>> {
    if points.len() < 4 {
        return None;
    }

    // Find two points with maximum X separation
    let v0 = find_min_x(points);
    let v1 = find_max_x(points);

    if v0 == v1 {
        // All points have same X, try alternate strategy
        return build_initial_tetrahedron_fallback(points, eps);
    }

    // Find third point: farthest from line v0-v1
    let v2 = find_point_farthest_from_line(points, v0, v1, eps)?;

    // Find fourth point: farthest from plane v0-v1-v2
    let v3 = find_point_farthest_from_plane(points, v0, v1, v2, eps)?;

    // Create four faces with consistent outward-pointing normals
    let centroid = points[v0].add(points[v1]).add(points[v2]).add(points[v3]).scale(0.25);

    let mut faces = Vec::with_capacity(4);
    let face_configs = [
        [v0, v1, v2],
        [v0, v3, v1],
        [v0, v2, v3],
        [v1, v3, v2],
    ];

    for config in &face_configs {
        let mut face = ConflictFace::new(config[0], config[1], config[2], points)?;

        // Ensure normal points away from centroid
        let to_centroid = centroid.subtract(face.center);
        if face.normal.dot(to_centroid) > 0.0 {
            // Flip winding
            face = ConflictFace::new_flipped(config[0], config[1], config[2], points)?;
        }

        faces.push(face);
    }

    Some(faces)
}

/// Fallback tetrahedron construction when primary method fails
fn build_initial_tetrahedron_fallback(points: &[Vec3], eps: f32) -> Option<Vec<ConflictFace>> {
    // Try all combinations of 4 points to find a non-degenerate tetrahedron
    let n = points.len().min(100);  // Limit search for performance

    for i in 0..n {
        for j in (i+1)..n {
            for k in (j+1)..n {
                // Check if these 3 points are non-collinear
                let p0 = points[i];
                let p1 = points[j];
                let p2 = points[k];

                let edge1 = p1.subtract(p0);
                let edge2 = p2.subtract(p0);
                let cross = edge1.cross(edge2);

                if cross.length() < eps {
                    continue;  // Collinear
                }

                // Find a fourth point off this plane
                let normal = cross.normalize();
                for l in 0..n {
                    if l == i || l == j || l == k { continue; }

                    let dist = normal.dot(points[l].subtract(p0)).abs();
                    if dist > eps {
                        // Found 4 non-coplanar points
                        let centroid = p0.add(p1).add(p2).add(points[l]).scale(0.25);
                        let mut faces = Vec::with_capacity(4);

                        let face_configs = [
                            [i, j, k],
                            [i, l, j],
                            [i, k, l],
                            [j, l, k],
                        ];

                        for config in &face_configs {
                            if let Some(mut face) = ConflictFace::new(config[0], config[1], config[2], points) {
                                let to_centroid = centroid.subtract(face.center);
                                if face.normal.dot(to_centroid) > 0.0 {
                                    if let Some(flipped) = ConflictFace::new_flipped(config[0], config[1], config[2], points) {
                                        face = flipped;
                                    }
                                }
                                faces.push(face);
                            }
                        }

                        if faces.len() == 4 {
                            return Some(faces);
                        }
                    }
                }
            }
        }
    }

    None
}

// ============================================================================
// Phase 2: Core Incremental Hull Algorithm
// ============================================================================

/// Find the conflict point with maximum distance from its conflict face
fn find_best_conflict_point(faces: &[ConflictFace], points: &[Vec3]) -> Option<(usize, usize)> {
    let mut best_point = None;
    let mut best_face = 0;
    let mut best_dist = 0.0;

    for (fi, face) in faces.iter().enumerate() {
        for &pi in &face.conflict_points {
            let dist = face.signed_distance(points[pi]);
            if dist > best_dist {
                best_dist = dist;
                best_point = Some(pi);
                best_face = fi;
            }
        }
    }

    best_point.map(|p| (p, best_face))
}

/// Find horizon edges - boundary between visible and non-visible faces
fn find_horizon_edges(faces: &[ConflictFace]) -> Vec<(usize, usize)> {
    // Count edge occurrences among visible faces
    let mut edge_info: HashMap<Edge, Vec<(usize, usize)>> = HashMap::new();

    for face in faces {
        if !face.is_visible { continue; }

        for i in 0..3 {
            let (a, b) = face.edge(i);
            let edge = Edge::new(a, b);
            edge_info.entry(edge)
                .or_default()
                .push((a, b));  // Store original direction
        }
    }

    // Horizon edges appear exactly once among visible faces
    let mut horizon = Vec::new();

    // Method 1: Find edges shared with non-visible faces
    for face in faces {
        if face.is_visible { continue; }

        for i in 0..3 {
            let (a, b) = face.edge(i);
            let edge = Edge::new(a, b);

            if let Some(occurrences) = edge_info.get(&edge) {
                if occurrences.len() == 1 {
                    // This edge is shared with exactly one visible face
                    // Use reversed direction for correct winding on new face
                    let (va, vb) = occurrences[0];
                    horizon.push((vb, va));
                }
            }
        }
    }

    // Method 2: If method 1 found nothing, use pure edge counting
    if horizon.is_empty() {
        for (_, occurrences) in &edge_info {
            if occurrences.len() == 1 {
                let (a, b) = occurrences[0];
                horizon.push((b, a));  // Reverse for correct winding
            }
        }
    }

    horizon
}

/// Compute centroid of a set of points
fn compute_centroid(points: &[Vec3], indices: &HashSet<usize>) -> Vec3 {
    if indices.is_empty() {
        return Vec3::new(0.0, 0.0, 0.0);
    }
    let mut sum = Vec3::new(0.0, 0.0, 0.0);
    for &i in indices {
        sum = sum.add(points[i]);
    }
    sum.scale(1.0 / indices.len() as f32)
}

/// Main incremental convex hull algorithm
fn incremental_hull(points: &[Vec3]) -> Option<Mesh> {
    if points.len() < 4 {
        return None;
    }

    let eps = adaptive_epsilon(points);

    // Step 1: Build initial tetrahedron
    let mut faces = build_initial_tetrahedron(points, eps)?;

    // Track which points are already in the hull (tetrahedron vertices)
    let tet_vertices: HashSet<usize> = faces.iter()
        .flat_map(|f| f.vertices.iter().copied())
        .collect();

    // Step 2: Initialize conflict lists
    for (i, p) in points.iter().enumerate() {
        if tet_vertices.contains(&i) { continue; }

        for face in &mut faces {
            if face.point_visible(*p, eps) {
                face.conflict_points.push(i);
                break;  // Each point assigned to at most one face initially
            }
        }
    }

    // Step 3: Process remaining points
    let mut processed = tet_vertices;
    let max_iterations = points.len() * 3;  // Safety limit
    let mut iteration = 0;

    while iteration < max_iterations {
        iteration += 1;

        // Find point with maximum distance from any conflict face
        let (apex, _face_idx) = match find_best_conflict_point(&faces, points) {
            Some(result) => result,
            None => break,  // No more conflict points - hull is complete
        };

        processed.insert(apex);
        let apex_point = points[apex];

        // Step 3a: Mark all faces visible from this point
        for face in &mut faces {
            face.is_visible = face.point_visible(apex_point, eps);
        }

        let visible_count = faces.iter().filter(|f| f.is_visible).count();
        if visible_count == 0 {
            // Point is inside hull (shouldn't happen with conflict lists, but handle gracefully)
            continue;
        }

        // Step 3b: Find horizon edges
        let horizon = find_horizon_edges(&faces);

        if horizon.is_empty() {
            // Degenerate case: all faces visible or numerical issue
            // Skip this point rather than corrupting the hull
            continue;
        }

        // Step 3c: Collect orphaned conflict points from visible faces
        let mut orphaned: Vec<usize> = Vec::new();
        for face in &faces {
            if face.is_visible {
                for &pi in &face.conflict_points {
                    if pi != apex && !processed.contains(&pi) {
                        orphaned.push(pi);
                    }
                }
            }
        }
        orphaned.sort_unstable();
        orphaned.dedup();

        // Step 3d: Remove visible faces
        faces.retain(|f| !f.is_visible);

        // Step 3e: Create new faces from horizon edges to apex
        let hull_center = compute_centroid(points, &processed);
        let mut new_faces = Vec::with_capacity(horizon.len());

        for (e0, e1) in &horizon {
            // Create face with correct winding (normal pointing outward)
            if let Some(mut new_face) = ConflictFace::new(*e0, *e1, apex, points) {
                // Verify normal points away from hull center
                let to_center = hull_center.subtract(new_face.center);
                if new_face.normal.dot(to_center) > 0.0 {
                    // Flip winding
                    if let Some(flipped) = ConflictFace::new_flipped(*e0, *e1, apex, points) {
                        new_face = flipped;
                    }
                }
                new_faces.push(new_face);
            }
        }

        // Step 3f: Reassign orphaned points to new faces
        for pi in orphaned {
            let p = points[pi];
            for face in &mut new_faces {
                if face.point_visible(p, eps) {
                    face.conflict_points.push(pi);
                    break;
                }
            }
        }

        faces.extend(new_faces);
    }

    // Step 4: Convert faces to mesh
    if faces.is_empty() {
        return None;
    }

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

// ============================================================================
// Phase 3: Special Case Handling
// ============================================================================

/// Detect if all points are coplanar (within tolerance)
fn detect_coplanar_set(points: &[Vec3], eps: f32) -> Option<(Vec3, Vec3)> {
    if points.len() < 3 {
        return None;
    }

    // Find first three non-collinear points to define the plane
    let p0 = points[0];
    let mut plane_normal = None;

    for i in 1..points.len() {
        for j in (i+1)..points.len() {
            let edge1 = points[i].subtract(p0);
            let edge2 = points[j].subtract(p0);
            let n = edge1.cross(edge2);
            if n.length() > eps {
                plane_normal = Some(n.normalize());
                break;
            }
        }
        if plane_normal.is_some() { break; }
    }

    let normal = match plane_normal {
        Some(n) => n,
        None => return Some((p0, Vec3::new(0.0, 0.0, 1.0))),  // All collinear, pick arbitrary normal
    };

    // Check if all points are on this plane
    for p in points {
        let dist = normal.dot(p.subtract(p0)).abs();
        if dist > eps {
            return None;  // Not coplanar
        }
    }

    Some((p0, normal))
}

/// Compute 2D convex hull for coplanar points and return as thin 3D mesh
fn hull_coplanar_points(points: &[Vec3], plane_point: Vec3, plane_normal: Vec3) -> Mesh {
    if points.len() < 3 {
        return Mesh::new(points.to_vec(), vec![]);
    }

    // Build local coordinate system on the plane
    let (u_axis, v_axis) = build_plane_basis(plane_normal);

    // Project all points to 2D
    let points_2d: Vec<(f32, f32)> = points.iter().map(|p| {
        let d = p.subtract(plane_point);
        (d.dot(u_axis), d.dot(v_axis))
    }).collect();

    // Compute 2D convex hull using gift wrapping
    let hull_indices = convex_hull_2d(&points_2d);

    if hull_indices.len() < 3 {
        return Mesh::new(points.to_vec(), vec![]);
    }

    // Create a thin 3D hull by triangulating the 2D hull
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    // Fan triangulation from first vertex
    let first = hull_indices[0];
    for i in 1..(hull_indices.len() - 1) {
        let base_idx = vertices.len() as u32;
        vertices.push(points[first]);
        vertices.push(points[hull_indices[i]]);
        vertices.push(points[hull_indices[i + 1]]);
        indices.push(base_idx);
        indices.push(base_idx + 1);
        indices.push(base_idx + 2);
    }

    Mesh::new(vertices, indices)
}

/// Build orthonormal basis vectors for a plane
fn build_plane_basis(normal: Vec3) -> (Vec3, Vec3) {
    // Find a vector not parallel to normal
    let not_parallel = if normal.x.abs() < 0.9 {
        Vec3::new(1.0, 0.0, 0.0)
    } else {
        Vec3::new(0.0, 1.0, 0.0)
    };

    let u = normal.cross(not_parallel).normalize();
    let v = normal.cross(u).normalize();

    (u, v)
}

/// 2D convex hull using gift wrapping (Jarvis march)
fn convex_hull_2d(points: &[(f32, f32)]) -> Vec<usize> {
    if points.len() < 3 {
        return (0..points.len()).collect();
    }

    // Find leftmost point
    let mut start = 0;
    for (i, p) in points.iter().enumerate() {
        if p.0 < points[start].0 || (p.0 == points[start].0 && p.1 < points[start].1) {
            start = i;
        }
    }

    let mut hull = vec![start];
    let mut current = start;

    loop {
        let mut next = 0;
        for i in 0..points.len() {
            if i == current { continue; }
            if next == current {
                next = i;
                continue;
            }

            // Cross product to determine turn direction
            let cross = cross_2d(points[current], points[next], points[i]);
            if cross < 0.0 || (cross == 0.0 && dist_sq_2d(points[current], points[i]) > dist_sq_2d(points[current], points[next])) {
                next = i;
            }
        }

        if next == start {
            break;
        }

        hull.push(next);
        current = next;

        // Safety: prevent infinite loop
        if hull.len() > points.len() {
            break;
        }
    }

    hull
}

#[inline]
fn cross_2d(o: (f32, f32), a: (f32, f32), b: (f32, f32)) -> f32 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

#[inline]
fn dist_sq_2d(a: (f32, f32), b: (f32, f32)) -> f32 {
    (b.0 - a.0) * (b.0 - a.0) + (b.1 - a.1) * (b.1 - a.1)
}

/// Apply tiny deterministic perturbation to break degeneracies
fn perturb_points(points: &[Vec3]) -> Vec<Vec3> {
    let mut rng_seed = 12345u64;  // Deterministic for reproducibility

    points.iter().map(|p| {
        // Simple LCG for perturbation
        rng_seed = rng_seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        let r1 = ((rng_seed >> 32) as f32 / u32::MAX as f32 - 0.5) * EPSILON_TIGHT * 10.0;
        rng_seed = rng_seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        let r2 = ((rng_seed >> 32) as f32 / u32::MAX as f32 - 0.5) * EPSILON_TIGHT * 10.0;
        rng_seed = rng_seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        let r3 = ((rng_seed >> 32) as f32 / u32::MAX as f32 - 0.5) * EPSILON_TIGHT * 10.0;

        Vec3::new(p.x + r1, p.y + r2, p.z + r3)
    }).collect()
}

// ============================================================================
// Phase 4: Public API with Fallback Chain
// ============================================================================

/// Compute the convex hull of a mesh
pub fn compute_hull(mesh: &Mesh) -> Mesh {
    if mesh.vertices.len() < 4 {
        return mesh.clone();
    }

    // Deduplicate points
    let points = dedup_points(&mesh.vertices);

    if points.len() < 4 {
        // After dedup, check for coplanar case
        let eps = adaptive_epsilon(&points);
        if let Some((plane_point, plane_normal)) = detect_coplanar_set(&points, eps) {
            return hull_coplanar_points(&points, plane_point, plane_normal);
        }
        return mesh.clone();
    }

    let eps = adaptive_epsilon(&points);

    // Check for fully coplanar input (common with linear_extrude)
    if let Some((plane_point, plane_normal)) = detect_coplanar_set(&points, eps) {
        return hull_coplanar_points(&points, plane_point, plane_normal);
    }

    // Try incremental algorithm
    if let Some(hull_mesh) = incremental_hull(&points) {
        // Validate result has enough geometry
        if hull_mesh.vertices.len() >= 4 && hull_mesh.indices.len() >= 4 {
            return hull_mesh;
        }
    }

    // Fallback 1: Try with perturbed points (symbolic perturbation)
    let perturbed = perturb_points(&points);
    if let Some(hull_mesh) = incremental_hull(&perturbed) {
        if hull_mesh.vertices.len() >= 4 && hull_mesh.indices.len() >= 4 {
            return hull_mesh;
        }
    }

    // Fallback 2: Return original mesh if all else fails
    mesh.clone()
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

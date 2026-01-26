/// Binary Space Partitioning tree implementation for CSG operations
use crate::geometry::Mesh;
use crate::math::Vec3;

const EPSILON: f32 = 1e-4;

// Debug logging macros for BSP operations
#[cfg(feature = "debug-bsp")]
macro_rules! bsp_debug {
    ($($arg:tt)*) => { eprintln!("[BSP DEBUG] {}", format!($($arg)*)) }
}
#[cfg(not(feature = "debug-bsp"))]
macro_rules! bsp_debug {
    ($($arg:tt)*) => {}
}

/// A plane in 3D space defined by a point and normal
#[derive(Clone, Copy, Debug)]
pub struct Plane {
    pub normal: Vec3,
    pub w: f32, // Distance from origin along normal
}

impl Plane {
    /// Create a plane from three points (counter-clockwise winding)
    pub fn from_points(a: Vec3, b: Vec3, c: Vec3) -> Option<Self> {
        let ab = b.subtract(a);
        let ac = c.subtract(a);
        let normal = ab.cross(ac);
        let len = normal.length();

        if len < EPSILON {
            return None; // Degenerate triangle
        }

        let normal = normal.scale(1.0 / len);
        let w = normal.dot(a);

        Some(Plane { normal, w })
    }

    /// Flip the plane (reverse normal)
    pub fn flip(&self) -> Plane {
        Plane {
            normal: self.normal.scale(-1.0),
            w: -self.w,
        }
    }

    /// Classify a point relative to this plane
    pub fn classify_point(&self, point: Vec3) -> PointClass {
        let dist = self.signed_distance(point);
        if dist < -EPSILON {
            PointClass::Back
        } else if dist > EPSILON {
            PointClass::Front
        } else {
            PointClass::Coplanar
        }
    }

    /// Signed distance from point to plane
    pub fn signed_distance(&self, point: Vec3) -> f32 {
        self.normal.dot(point) - self.w
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PointClass {
    Coplanar,
    Front,
    Back,
}

/// A polygon (triangle) for BSP operations
#[derive(Clone, Debug)]
pub struct Polygon {
    pub vertices: Vec<Vec3>,
    pub plane: Plane,
}

impl Polygon {
    pub fn new(vertices: Vec<Vec3>) -> Option<Self> {
        if vertices.len() < 3 {
            return None;
        }
        let plane = Plane::from_points(vertices[0], vertices[1], vertices[2])?;
        Some(Polygon { vertices, plane })
    }

    pub fn flip(&self) -> Polygon {
        let mut flipped_verts = self.vertices.clone();
        flipped_verts.reverse();
        Polygon {
            vertices: flipped_verts,
            plane: self.plane.flip(),
        }
    }

    /// Get the centroid of the polygon
    pub fn centroid(&self) -> Vec3 {
        let mut sum = Vec3::new(0.0, 0.0, 0.0);
        for v in &self.vertices {
            sum = sum.add(*v);
        }
        sum.scale(1.0 / self.vertices.len() as f32)
    }

    /// Split polygon by a plane
    pub fn split_by_plane(&self, plane: &Plane) -> SplitResult {
        let mut front_verts = Vec::new();
        let mut back_verts = Vec::new();

        let classes: Vec<PointClass> = self
            .vertices
            .iter()
            .map(|v| plane.classify_point(*v))
            .collect();

        let mut has_front = false;
        let mut has_back = false;

        for &class in &classes {
            match class {
                PointClass::Front => has_front = true,
                PointClass::Back => has_back = true,
                _ => {}
            }
        }

        if !has_front && !has_back {
            // All coplanar - check normal direction
            let same_direction = self.plane.normal.dot(plane.normal) > 0.0;
            return if same_direction {
                SplitResult::CoplanarFront(self.clone())
            } else {
                SplitResult::CoplanarBack(self.clone())
            };
        }

        if !has_front {
            return SplitResult::Back(self.clone());
        }
        if !has_back {
            return SplitResult::Front(self.clone());
        }

        // Polygon spans plane - split it
        let n = self.vertices.len();
        for i in 0..n {
            let j = (i + 1) % n;
            let vi = self.vertices[i];
            let vj = self.vertices[j];
            let ti = classes[i];
            let tj = classes[j];

            match ti {
                PointClass::Coplanar => {
                    front_verts.push(vi);
                    back_verts.push(vi);
                }
                PointClass::Front => {
                    front_verts.push(vi);
                }
                PointClass::Back => {
                    back_verts.push(vi);
                }
            }

            if (ti == PointClass::Front && tj == PointClass::Back)
                || (ti == PointClass::Back && tj == PointClass::Front)
            {
                let diff = vj.subtract(vi);
                let denom = plane.normal.dot(diff);

                // Avoid division by zero and numerical instability
                if denom.abs() > EPSILON * 0.1 {
                    let t = (plane.w - plane.normal.dot(vi)) / denom;
                    // Clamp t to [0,1] to prevent extrapolation errors
                    let t = t.clamp(0.0, 1.0);
                    let v = vi.add(diff.scale(t));
                    front_verts.push(v);
                    back_verts.push(v);
                } else {
                    // Edge is nearly parallel to plane - use midpoint
                    let mid = vi.add(diff.scale(0.5));
                    front_verts.push(mid);
                    back_verts.push(mid);
                }
            }
        }

        let front_poly = if front_verts.len() >= 3 {
            Polygon::new(front_verts)
        } else {
            None
        };

        let back_poly = if back_verts.len() >= 3 {
            Polygon::new(back_verts)
        } else {
            None
        };

        SplitResult::Split(front_poly, back_poly)
    }
}

pub enum SplitResult {
    Front(Polygon),
    Back(Polygon),
    CoplanarFront(Polygon),
    CoplanarBack(Polygon),
    Split(Option<Polygon>, Option<Polygon>),
}

/// BSP Tree node
#[derive(Clone)]
pub struct BSPNode {
    plane: Option<Plane>,
    front: Option<Box<BSPNode>>,
    back: Option<Box<BSPNode>>,
    polygons: Vec<Polygon>,
}

impl BSPNode {
    pub fn new(polygons: Vec<Polygon>) -> Option<Self> {
        if polygons.is_empty() {
            return None;
        }

        let mut node = BSPNode {
            plane: None,
            front: None,
            back: None,
            polygons: Vec::new(),
        };

        node.build(polygons);
        Some(node)
    }

    /// Choose best splitting plane using heuristic
    fn choose_splitting_plane(polygons: &[Polygon]) -> Plane {
        if polygons.is_empty() {
            panic!("Cannot choose plane from empty polygon list");
        }

        // Simple heuristic: choose plane that minimizes splits and balances tree
        let mut best_score = i32::MAX;
        let mut best_plane = polygons[0].plane;

        for poly in polygons {
            let candidate = poly.plane;

            // Score: penalize imbalance and splits
            let mut front_count = 0i32;
            let mut back_count = 0i32;
            let mut split_count = 0i32;

            for poly in polygons {
                let mut has_front = false;
                let mut has_back = false;

                for v in &poly.vertices {
                    let d = candidate.signed_distance(*v);
                    if d > EPSILON {
                        has_front = true;
                    } else if d < -EPSILON {
                        has_back = true;
                    }
                }

                if has_front && has_back {
                    split_count += 1;
                } else if has_front {
                    front_count += 1;
                } else {
                    back_count += 1;
                }
            }

            // Score: balance + heavy penalty for splits
            let score = (front_count - back_count).abs() + split_count * 8;
            if score < best_score {
                best_score = score;
                best_plane = candidate;
            }
        }

        best_plane
    }

    /// Build the BSP tree with depth limiting to prevent stack overflow
    fn build(&mut self, polygons: Vec<Polygon>) {
        self.build_with_depth(polygons, 0);
    }

    /// Add new polygons to an existing BSP tree (public interface)
    /// Simply extends the polygon list at this node.
    /// The polygons should already be clipped by the CSG algorithm before calling this.
    pub fn add_polygons(&mut self, polygons: Vec<Polygon>) {
        if polygons.is_empty() {
            return;
        }
        // Simply extend the polygon list at this node
        // By the time this is called in difference(), the polygons have already been
        // properly clipped by the CSG algorithm (Steps 3-6), so we just merge them
        self.polygons.extend(polygons);
    }

    /// Maximum BSP tree depth to prevent stack overflow
    const MAX_BSP_DEPTH: usize = 100;

    fn build_with_depth(&mut self, mut polygons: Vec<Polygon>, depth: usize) {
        if polygons.is_empty() {
            return;
        }

        // Safety: prevent stack overflow with depth limit
        if depth >= Self::MAX_BSP_DEPTH {
            // At max depth, just store remaining polygons without further splitting
            self.polygons.extend(polygons);
            return;
        }

        // Choose splitting plane using heuristic to minimize splits
        if self.plane.is_none() {
            self.plane = Some(Self::choose_splitting_plane(&polygons));
        }

        let plane = self.plane.unwrap();
        // Pre-allocate with estimated capacity to reduce reallocations
        let estimated_size = polygons.len() / 2 + 1;
        let mut front = Vec::with_capacity(estimated_size);
        let mut back = Vec::with_capacity(estimated_size);

        for poly in polygons.drain(..) {
            match poly.split_by_plane(&plane) {
                SplitResult::CoplanarFront(p) | SplitResult::CoplanarBack(p) => {
                    self.polygons.push(p);
                }
                SplitResult::Front(p) => front.push(p),
                SplitResult::Back(p) => back.push(p),
                SplitResult::Split(f, b) => {
                    if let Some(fp) = f {
                        front.push(fp);
                    }
                    if let Some(bp) = b {
                        back.push(bp);
                    }
                }
            }
        }

        if !front.is_empty() {
            if self.front.is_none() {
                self.front = Some(Box::new(BSPNode {
                    plane: None,
                    front: None,
                    back: None,
                    polygons: Vec::new(),
                }));
            }
            self.front.as_mut().unwrap().build_with_depth(front, depth + 1);
        }

        if !back.is_empty() {
            if self.back.is_none() {
                self.back = Some(Box::new(BSPNode {
                    plane: None,
                    front: None,
                    back: None,
                    polygons: Vec::new(),
                }));
            }
            self.back.as_mut().unwrap().build_with_depth(back, depth + 1);
        }
    }

    /// Invert the BSP tree (swap inside/outside)
    pub fn invert(&mut self) {
        for poly in &mut self.polygons {
            *poly = poly.flip();
        }
        if let Some(ref mut p) = self.plane {
            *p = p.flip();
        }
        std::mem::swap(&mut self.front, &mut self.back);
        if let Some(ref mut front) = self.front {
            front.invert();
        }
        if let Some(ref mut back) = self.back {
            back.invert();
        }
    }

    /// Remove all polygons in this BSP tree that are inside the other BSP tree
    pub fn clip_to(&mut self, bsp: &BSPNode) {
        self.polygons = bsp.clip_polygons(&self.polygons);
        if let Some(ref mut front) = self.front {
            front.clip_to(bsp);
        }
        if let Some(ref mut back) = self.back {
            back.clip_to(bsp);
        }
    }

    /// Recursively clip polygons - removes polygons that are inside this BSP solid
    /// This is the key function for CSG operations
    fn clip_polygons(&self, polygons: &[Polygon]) -> Vec<Polygon> {
        bsp_debug!("clip_polygons() called with {} polygons", polygons.len());

        if self.plane.is_none() {
            bsp_debug!("  -> no plane, returning all {} polygons", polygons.len());
            return polygons.to_vec();
        }

        let plane = self.plane.unwrap();
        let estimated_size = polygons.len() / 2 + 1;
        let mut front = Vec::with_capacity(estimated_size);
        let mut back = Vec::with_capacity(estimated_size);

        for poly in polygons {
            match poly.split_by_plane(&plane) {
                SplitResult::Front(p) | SplitResult::CoplanarFront(p) => front.push(p),
                SplitResult::Back(p) | SplitResult::CoplanarBack(p) => back.push(p),
                SplitResult::Split(f, b) => {
                    if let Some(fp) = f {
                        front.push(fp);
                    }
                    if let Some(bp) = b {
                        back.push(bp);
                    }
                }
            }
        }

        bsp_debug!("  -> split into front={} back={}", front.len(), back.len());

        // Recursively clip front polygons
        let mut result = if let Some(ref front_node) = self.front {
            let clipped = front_node.clip_polygons(&front);
            bsp_debug!("  -> front node clipped {} polygons to {}", front.len(), clipped.len());
            clipped
        } else {
            bsp_debug!("  -> no front node, KEEPING all {} front polygons (outside)", front.len());
            // No front node means these are outside the solid - KEEP them
            front
        };

        // Recursively clip back polygons
        let back_result = if let Some(ref back_node) = self.back {
            let clipped = back_node.clip_polygons(&back);
            bsp_debug!("  -> back node clipped {} polygons to {}", back.len(), clipped.len());
            clipped
        } else {
            bsp_debug!("  -> no back node, DISCARDING all {} back polygons (inside)", back.len());
            // No back node means these are inside the solid - DISCARD them
            Vec::new()
        };

        result.extend(back_result);
        bsp_debug!("  -> clip_polygons() returning {} total polygons", result.len());
        result
    }

    /// Get all polygons from this tree
    pub fn all_polygons(&self) -> Vec<Polygon> {
        let mut result = self.polygons.clone();
        if let Some(ref front) = self.front {
            result.extend(front.all_polygons());
        }
        if let Some(ref back) = self.back {
            result.extend(back.all_polygons());
        }
        result
    }

    /// Build a tree from polygons
    pub fn from_polygons(polygons: Vec<Polygon>) -> Option<Self> {
        BSPNode::new(polygons)
    }

    /// Test if a point is inside this BSP solid using ray casting
    /// Returns true if the point is inside the solid
    pub fn point_inside(&self, point: Vec3) -> bool {
        // Use the BSP tree structure to determine inside/outside
        // A point is inside if it ends up in a "back" leaf (no back node)
        self.point_inside_recursive(point)
    }

    fn point_inside_recursive(&self, point: Vec3) -> bool {
        match self.plane {
            None => false, // Empty tree - point is outside
            Some(plane) => {
                let dist = plane.signed_distance(point);
                if dist > EPSILON {
                    // Point is in front of plane
                    match &self.front {
                        Some(front) => front.point_inside_recursive(point),
                        None => false, // Outside
                    }
                } else if dist < -EPSILON {
                    // Point is behind plane (inside direction)
                    match &self.back {
                        Some(back) => back.point_inside_recursive(point),
                        None => true, // Inside (reached back leaf)
                    }
                } else {
                    // On the plane - check both sides
                    let in_front = self.front.as_ref().map_or(false, |f| f.point_inside_recursive(point));
                    let in_back = self.back.as_ref().map_or(true, |b| b.point_inside_recursive(point));
                    in_front || in_back
                }
            }
        }
    }
}

/// CSG operations using BSP trees
pub mod operations {
    use super::*;
    use crate::geometry::Mesh;

    /// Convert mesh to polygons for BSP operations
    pub fn mesh_to_polygons(mesh: &Mesh) -> Vec<Polygon> {
        let mut polygons = Vec::new();
        for i in (0..mesh.indices.len()).step_by(3) {
            if i + 2 < mesh.indices.len() {
                let v0 = mesh.vertices[mesh.indices[i] as usize];
                let v1 = mesh.vertices[mesh.indices[i + 1] as usize];
                let v2 = mesh.vertices[mesh.indices[i + 2] as usize];
                if let Some(poly) = Polygon::new(vec![v0, v1, v2]) {
                    polygons.push(poly);
                }
            }
        }
        polygons
    }

    /// Convert polygons back to mesh
    pub fn polygons_to_mesh(polygons: &[Polygon]) -> Mesh {
        let mut vertices = Vec::new();
        let mut indices = Vec::new();

        // For flat shading, we need to duplicate vertices per triangle
        // so each triangle can have its own unique normals
        for poly in polygons {
            // Triangulate polygon (fan triangulation)
            if poly.vertices.len() >= 3 {
                let v0 = poly.vertices[0];
                let v1 = poly.vertices[1];
                let v2 = poly.vertices[2];
                let triangle_normal = v1.subtract(v0).cross(v2.subtract(v0));
                let normal_len = triangle_normal.length();

                const THIN_EPSILON: f32 = 1e-6;

                // Check winding direction - ensure triangle normal matches polygon plane normal
                let same_direction = if normal_len > THIN_EPSILON {
                    let triangle_normal = triangle_normal.scale(1.0 / normal_len);
                    triangle_normal.dot(poly.plane.normal) > 0.0
                } else {
                    // For degenerate triangles, trust the polygon plane normal
                    true
                };

                // Create triangles with duplicated vertices (for flat shading)
                for i in 1..(poly.vertices.len() - 1) {
                    let base_idx = vertices.len() as u32;

                    if same_direction {
                        // Add triangle vertices (duplicated, not shared)
                        vertices.push(poly.vertices[0]);
                        vertices.push(poly.vertices[i]);
                        vertices.push(poly.vertices[i + 1]);

                        indices.push(base_idx);
                        indices.push(base_idx + 1);
                        indices.push(base_idx + 2);
                    } else {
                        // Flip winding to match polygon plane normal
                        vertices.push(poly.vertices[0]);
                        vertices.push(poly.vertices[i + 1]);
                        vertices.push(poly.vertices[i]);

                        indices.push(base_idx);
                        indices.push(base_idx + 1);
                        indices.push(base_idx + 2);
                    }
                }
            }
        }

        let mut mesh = Mesh::new(vertices, indices);

        // For BSP meshes, use flat normals per face (no smoothing across polygons)
        // Now that vertices are duplicated per triangle, each can have its own normal
        calculate_flat_normals(&mut mesh);

        mesh
    }

    /// Calculate flat normals per face (no smoothing across polygons)
    /// Each triangle gets its face normal assigned to all three vertices
    /// Also removes degenerate triangles (zero area or too small)
    fn calculate_flat_normals(mesh: &mut Mesh) {
        use crate::geometry::Mesh;
        use crate::math::Vec3;

        // Initialize normals
        mesh.normals = vec![Vec3::zero(); mesh.vertices.len()];

        let mut valid_indices = Vec::new();
        let mut valid_vertices = Vec::new();
        let mut valid_normals = Vec::new();

        const MIN_TRIANGLE_AREA: f32 = 1e-8;

        // Calculate face normal for each triangle and filter degenerates
        for i in (0..mesh.indices.len()).step_by(3) {
            if i + 2 >= mesh.indices.len() {
                continue;
            }

            let i0 = mesh.indices[i] as usize;
            let i1 = mesh.indices[i + 1] as usize;
            let i2 = mesh.indices[i + 2] as usize;

            if i0 >= mesh.vertices.len() || i1 >= mesh.vertices.len() || i2 >= mesh.vertices.len() {
                continue;
            }

            let v0 = mesh.vertices[i0];
            let v1 = mesh.vertices[i1];
            let v2 = mesh.vertices[i2];

            // Calculate face normal
            let edge1 = v1.subtract(v0);
            let edge2 = v2.subtract(v0);
            let face_normal = edge1.cross(edge2);
            let len = face_normal.length();

            // Calculate triangle area (half of cross product magnitude)
            let area = len / 2.0;

            // Skip degenerate triangles (too small or zero area)
            if area > MIN_TRIANGLE_AREA && len > 1e-12 {
                let face_normal = face_normal.scale(1.0 / len);

                // Add this triangle's vertices and normals
                let new_idx = valid_vertices.len() as u32;
                valid_vertices.push(v0);
                valid_vertices.push(v1);
                valid_vertices.push(v2);
                valid_normals.push(face_normal);
                valid_normals.push(face_normal);
                valid_normals.push(face_normal);
                valid_indices.push(new_idx);
                valid_indices.push(new_idx + 1);
                valid_indices.push(new_idx + 2);
            }
        }

        // Replace mesh data with filtered data
        mesh.vertices = valid_vertices;
        mesh.indices = valid_indices;
        mesh.normals = valid_normals;
    }

    /// Fix inverted normals by ensuring all normals point outward from the mesh centroid
    fn fix_inverted_normals(mesh: &mut Mesh) {
        if mesh.vertices.is_empty() || mesh.indices.is_empty() || mesh.indices.len() < 3 {
            return;
        }

        let num_triangles = mesh.indices.len() / 3;

        // Build edge adjacency map to find neighboring triangles
        use std::collections::HashMap;
        let mut edge_to_triangles: HashMap<(u32, u32), Vec<usize>> = HashMap::new();

        for tri_idx in 0..num_triangles {
            let i = tri_idx * 3;
            let i0 = mesh.indices[i];
            let i1 = mesh.indices[i + 1];
            let i2 = mesh.indices[i + 2];

            // Store edges in sorted order so we can match them
            let edges = [
                (i0.min(i1), i0.max(i1)),
                (i1.min(i2), i1.max(i2)),
                (i2.min(i0), i2.max(i0)),
            ];

            for edge in edges {
                edge_to_triangles.entry(edge).or_insert_with(Vec::new).push(tri_idx);
            }
        }

        // Track which triangles have been processed and their orientation
        let mut processed = vec![false; num_triangles];
        let mut queue = Vec::new();

        // Start with the first triangle and assume its orientation is correct
        queue.push(0);
        processed[0] = true;

        // Propagate consistent orientation through neighboring triangles
        while let Some(current_tri) = queue.pop() {
            let i = current_tri * 3;
            let i0 = mesh.indices[i];
            let i1 = mesh.indices[i + 1];
            let i2 = mesh.indices[i + 2];

            // Check each edge of the current triangle
            let edges = [
                ((i0, i1), (i0.min(i1), i0.max(i1))),
                ((i1, i2), (i1.min(i2), i1.max(i2))),
                ((i2, i0), (i2.min(i0), i2.max(i0))),
            ];

            for ((v1, v2), sorted_edge) in edges {
                if let Some(neighbors) = edge_to_triangles.get(&sorted_edge) {
                    for &neighbor_tri in neighbors {
                        if neighbor_tri == current_tri || processed[neighbor_tri] {
                            continue;
                        }

                        // Check if neighbor has opposite winding for this shared edge
                        let ni = neighbor_tri * 3;
                        let ni0 = mesh.indices[ni];
                        let ni1 = mesh.indices[ni + 1];
                        let ni2 = mesh.indices[ni + 2];

                        // Check each edge of neighbor triangle
                        let neighbor_edges = [(ni0, ni1), (ni1, ni2), (ni2, ni0)];

                        for (nv1, nv2) in neighbor_edges {
                            // Shared edge should have opposite order in neighboring triangle
                            // Current: (v1, v2), Neighbor should have: (v2, v1)
                            if (v1 == nv2 && v2 == nv1) {
                                // Correct opposite winding - this is good
                                processed[neighbor_tri] = true;
                                queue.push(neighbor_tri);
                                break;
                            } else if (v1 == nv1 && v2 == nv2) {
                                // Same winding - neighbor needs to be flipped
                                mesh.indices.swap(ni + 1, ni + 2);
                                processed[neighbor_tri] = true;
                                queue.push(neighbor_tri);
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Recalculate normals after fixing winding
        mesh.calculate_normals();
    }

    /// Union: A ∪ B
    /// Return a new mesh that is the combination of A and B
    pub fn union(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
        let polys_a = mesh_to_polygons(mesh_a);
        let polys_b = mesh_to_polygons(mesh_b);

        if polys_a.is_empty() {
            return mesh_b.clone();
        }
        if polys_b.is_empty() {
            return mesh_a.clone();
        }

        let mut a = match BSPNode::from_polygons(polys_a) {
            Some(node) => node,
            None => return mesh_b.clone(),
        };
        let mut b = match BSPNode::from_polygons(polys_b) {
            Some(node) => node,
            None => return mesh_a.clone(),
        };

        // Union algorithm from CSG.js:
        // 1. Clip A to B (remove parts of A inside B)
        // 2. Clip B to A (remove parts of B inside A)
        // 3. Invert B, clip to A, invert back (handle coplanar faces)
        a.clip_to(&b);
        b.clip_to(&a);
        b.invert();
        b.clip_to(&a);
        b.invert();

        let mut all_polys = a.all_polygons();
        all_polys.extend(b.all_polygons());

        polygons_to_mesh(&all_polys)
    }

    /// Difference: A - B
    /// Return a new mesh that is A with B subtracted
    pub fn difference(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
        let polys_a = mesh_to_polygons(mesh_a);
        let polys_b = mesh_to_polygons(mesh_b);

        bsp_debug!("difference() START: A has {} polygons, B has {} polygons", polys_a.len(), polys_b.len());

        if polys_a.is_empty() {
            bsp_debug!("difference() EARLY EXIT: A is empty");
            return Mesh::new(vec![], vec![]);
        }
        if polys_b.is_empty() {
            bsp_debug!("difference() EARLY EXIT: B is empty, returning A unchanged");
            return mesh_a.clone();
        }

        // Get bounding boxes
        let bb_a = mesh_a.bounds.clone();
        let bb_b = mesh_b.bounds.clone();

        // Helper to check if polygon's bounding box intersects with a bounding box
        fn poly_intersects_bounds(poly: &Polygon, bb_min: &[f32; 3], bb_max: &[f32; 3]) -> bool {
            let mut p_min = [f32::MAX; 3];
            let mut p_max = [f32::MIN; 3];
            for v in &poly.vertices {
                p_min[0] = p_min[0].min(v.x);
                p_min[1] = p_min[1].min(v.y);
                p_min[2] = p_min[2].min(v.z);
                p_max[0] = p_max[0].max(v.x);
                p_max[1] = p_max[1].max(v.y);
                p_max[2] = p_max[2].max(v.z);
            }
            // Check AABB intersection
            p_max[0] >= bb_min[0] && p_min[0] <= bb_max[0] &&
            p_max[1] >= bb_min[1] && p_min[1] <= bb_max[1] &&
            p_max[2] >= bb_min[2] && p_min[2] <= bb_max[2]
        }

        // Partition A polygons: those that may intersect B vs those completely outside B
        let (a_clip, a_passthru): (Vec<_>, Vec<_>) = polys_a
            .into_iter()
            .partition(|p| poly_intersects_bounds(p, &bb_b.min, &bb_b.max));

        // Partition B polygons: those that may intersect A vs those completely outside A
        let (b_clip, _b_passthru): (Vec<_>, Vec<_>) = polys_b
            .into_iter()
            .partition(|p| poly_intersects_bounds(p, &bb_a.min, &bb_a.max));

        bsp_debug!("difference() partitioned: a_clip={}, a_passthru={}, b_clip={}",
                   a_clip.len(), a_passthru.len(), b_clip.len());

        // If no A polygons intersect B's bounding box, just return A unchanged
        if a_clip.is_empty() {
            bsp_debug!("difference() EARLY EXIT: No A polygons intersect B");
            return mesh_a.clone();
        }

        // If no B polygons intersect A's bounding box, just return A unchanged
        if b_clip.is_empty() {
            bsp_debug!("difference() EARLY EXIT: No B polygons intersect A");
            return mesh_a.clone();
        }

        // Build BSP trees only from polygons that may intersect
        let mut a = match BSPNode::from_polygons(a_clip) {
            Some(node) => node,
            None => return mesh_a.clone(),
        };
        let mut b = match BSPNode::from_polygons(b_clip) {
            Some(node) => node,
            None => return mesh_a.clone(),
        };

        // Difference algorithm from CSG.js:
        // A - B = ~(~A ∪ B)
        bsp_debug!("difference() Step 1: a.invert() - flipping A inside-out");
        a.invert();

        bsp_debug!("difference() Step 2: a.clip_to(&b) - remove parts of A inside B");
        a.clip_to(&b);
        let a_polys_after_clip = a.all_polygons().len();
        bsp_debug!("  -> A now has {} polygons", a_polys_after_clip);

        bsp_debug!("difference() Step 3: b.clip_to(&a) - remove parts of B outside A");
        b.clip_to(&a);
        let b_polys_after_clip = b.all_polygons().len();
        bsp_debug!("  -> B now has {} polygons", b_polys_after_clip);

        bsp_debug!("difference() Step 4: b.invert() - flip B");
        b.invert();

        bsp_debug!("difference() Step 5: b.clip_to(&a) - remove parts of B inside A");
        b.clip_to(&a);
        let b_polys_after_clip2 = b.all_polygons().len();
        bsp_debug!("  -> B now has {} polygons", b_polys_after_clip2);

        bsp_debug!("difference() Step 6: b.invert() - flip B back");
        b.invert();

        bsp_debug!("difference() Step 7: a.add_polygons(b.all_polygons()) - add B surface to A");
        a.add_polygons(b.all_polygons());
        let a_polys_after_add = a.all_polygons().len();
        bsp_debug!("  -> A now has {} polygons", a_polys_after_add);

        bsp_debug!("difference() Step 8: a.invert() - flip A back");
        a.invert();

        // Combine clipped result with passthrough polygons (those outside B's bounding box)
        let mut result_polys = a.all_polygons();
        result_polys.extend(a_passthru);

        bsp_debug!("difference() COMPLETE: result has {} total polygons", result_polys.len());

        polygons_to_mesh(&result_polys)
    }

    /// Intersection: A ∩ B
    /// Return a new mesh that is the overlapping region of A and B
    pub fn intersection(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
        let polys_a = mesh_to_polygons(mesh_a);
        let polys_b = mesh_to_polygons(mesh_b);

        if polys_a.is_empty() || polys_b.is_empty() {
            return Mesh::new(vec![], vec![]);
        }

        let mut a = match BSPNode::from_polygons(polys_a) {
            Some(node) => node,
            None => return Mesh::new(vec![], vec![]),
        };
        let mut b = match BSPNode::from_polygons(polys_b) {
            Some(node) => node,
            None => return Mesh::new(vec![], vec![]),
        };

        // Intersection algorithm from CSG.js:
        // A ∩ B = ~(~A ∪ ~B)
        a.invert();
        b.clip_to(&a);
        b.invert();
        a.clip_to(&b);
        b.clip_to(&a);

        a.add_polygons(b.all_polygons());
        a.invert();

        polygons_to_mesh(&a.all_polygons())
    }

    /// Invert a mesh (flip all triangle normals)
    pub fn invert_mesh(mesh: &mut Mesh) {
        // Flip triangle winding order by reversing indices in groups of 3
        for i in (0..mesh.indices.len()).step_by(3) {
            if i + 2 < mesh.indices.len() {
                mesh.indices.swap(i + 1, i + 2);
            }
        }
        // Recalculate normals with flipped winding
        mesh.calculate_normals();
    }
}

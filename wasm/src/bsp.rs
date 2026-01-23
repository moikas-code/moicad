/// BSP Tree implementation for CSG operations
/// Based on the classic BSP algorithm for mesh boolean operations
use crate::math::Vec3;

const EPSILON: f32 = 1e-5;

/// A plane in 3D space defined by a normal and distance from origin
#[derive(Clone, Copy, Debug)]
pub struct Plane {
    pub normal: Vec3,
    pub w: f32,
}

impl Plane {
    pub fn from_points(a: Vec3, b: Vec3, c: Vec3) -> Option<Self> {
        let n = b.subtract(a).cross(c.subtract(a)).normalize();
        if n.length() < EPSILON {
            return None;
        }
        Some(Plane {
            normal: n,
            w: n.dot(a),
        })
    }

    /// Returns positive if point is in front, negative if behind, 0 if on plane
    pub fn signed_distance(&self, point: Vec3) -> f32 {
        self.normal.dot(point) - self.w
    }

    /// Classify a point relative to this plane
    pub fn classify_point(&self, point: Vec3) -> PointClass {
        let d = self.signed_distance(point);
        if d > EPSILON {
            PointClass::Front
        } else if d < -EPSILON {
            PointClass::Back
        } else {
            PointClass::Coplanar
        }
    }

    pub fn flip(&self) -> Plane {
        Plane {
            normal: self.normal.scale(-1.0),
            w: -self.w,
        }
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

    /// Split polygon by plane into front and back parts
    pub fn split_by_plane(&self, plane: &Plane) -> SplitResult {
        let mut front_pts = Vec::new();
        let mut back_pts = Vec::new();
        let mut types = Vec::new();

        // Classify all vertices
        for v in &self.vertices {
            types.push(plane.classify_point(*v));
        }

        // Check if all vertices are on one side
        let all_front = types.iter().all(|t| *t != PointClass::Back);
        let all_back = types.iter().all(|t| *t != PointClass::Front);

        if all_front && all_back {
            // Coplanar - check if facing same direction
            if self.plane.normal.dot(plane.normal) > 0.0 {
                return SplitResult::CoplanarFront(self.clone());
            } else {
                return SplitResult::CoplanarBack(self.clone());
            }
        }

        if all_front {
            return SplitResult::Front(self.clone());
        }

        if all_back {
            return SplitResult::Back(self.clone());
        }

        // Need to split
        let n = self.vertices.len();
        for i in 0..n {
            let j = (i + 1) % n;
            let ti = types[i];
            let tj = types[j];
            let vi = self.vertices[i];
            let vj = self.vertices[j];

            if ti != PointClass::Back {
                front_pts.push(vi);
            }
            if ti != PointClass::Front {
                back_pts.push(vi);
            }

            if (ti == PointClass::Front && tj == PointClass::Back)
                || (ti == PointClass::Back && tj == PointClass::Front)
            {
                // Compute intersection point
                let t = (plane.w - plane.normal.dot(vi)) / plane.normal.dot(vj.subtract(vi));
                let intersection = vi.add(vj.subtract(vi).scale(t));
                front_pts.push(intersection);
                back_pts.push(intersection);
            }
        }

        let front_poly = if front_pts.len() >= 3 {
            Polygon::new(front_pts)
        } else {
            None
        };
        let back_poly = if back_pts.len() >= 3 {
            Polygon::new(back_pts)
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

    fn build(&mut self, mut polygons: Vec<Polygon>) {
        if polygons.is_empty() {
            return;
        }

        // Use first polygon's plane as splitting plane
        if self.plane.is_none() {
            self.plane = Some(polygons[0].plane);
        }

        let plane = self.plane.unwrap();
        let mut front = Vec::new();
        let mut back = Vec::new();

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
            self.front.as_mut().unwrap().build(front);
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
            self.back.as_mut().unwrap().build(back);
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

    /// Recursively clip polygons
    fn clip_polygons(&self, polygons: &[Polygon]) -> Vec<Polygon> {
        if self.plane.is_none() {
            return polygons.to_vec();
        }

        let plane = self.plane.unwrap();
        let mut front = Vec::new();
        let mut back = Vec::new();

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

        let mut result = if let Some(ref front_node) = self.front {
            front_node.clip_polygons(&front)
        } else {
            front
        };

        let back_result = if let Some(ref back_node) = self.back {
            back_node.clip_polygons(&back)
        } else {
            Vec::new() // Discard back polygons if no back node
        };

        result.extend(back_result);
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

        for poly in polygons {
            let base_idx = vertices.len() as u32;

            // Add vertices
            for v in &poly.vertices {
                vertices.push(*v);
            }

            // Triangulate polygon (fan triangulation)
            for i in 1..(poly.vertices.len() - 1) {
                indices.push(base_idx);
                indices.push(base_idx + i as u32);
                indices.push(base_idx + (i + 1) as u32);
            }
        }

        Mesh::new(vertices, indices)
    }

    /// Union: A + B
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

        if polys_a.is_empty() {
            return Mesh::new(vec![], vec![]);
        }
        if polys_b.is_empty() {
            return mesh_a.clone();
        }

        let mut a = match BSPNode::from_polygons(polys_a) {
            Some(node) => node,
            None => return Mesh::new(vec![], vec![]),
        };
        let mut b = match BSPNode::from_polygons(polys_b) {
            Some(node) => node,
            None => return mesh_a.clone(),
        };

        a.invert();
        a.clip_to(&b);
        b.clip_to(&a);
        b.invert();
        b.clip_to(&a);
        b.invert();

        let mut all_polys = a.all_polygons();
        all_polys.extend(b.all_polygons());

        let mut result = polygons_to_mesh(&all_polys);
        // Invert the result since we inverted A
        invert_mesh(&mut result);
        result
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

        a.invert();
        b.clip_to(&a);
        b.invert();
        a.clip_to(&b);
        b.clip_to(&a);

        let mut all_polys = a.all_polygons();
        all_polys.extend(b.all_polygons());

        let mut result = polygons_to_mesh(&all_polys);
        invert_mesh(&mut result);
        result
    }

    /// Invert mesh (flip all faces)
    fn invert_mesh(mesh: &mut Mesh) {
        // Flip triangle winding order
        for i in (0..mesh.indices.len()).step_by(3) {
            if i + 2 < mesh.indices.len() {
                mesh.indices.swap(i + 1, i + 2);
            }
        }
        // Recalculate normals
        mesh.calculate_normals();
    }
}

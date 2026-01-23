use crate::geometry::Mesh;
use crate::hull::compute_hull;
/// Minkowski sum operation for CSG
/// Very computationally expensive - convex hull of sum of shapes
use crate::math::Vec3;

/// Compute Minkowski sum of two meshes
/// For now, implements simplified version using convex hull approximation
pub fn minkowski(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
    if mesh_a.vertices.is_empty() && mesh_b.vertices.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    // For complex Minkowski, we'd need to compute sum of all points from A+B
    // For now, use approximation: convex hull of both meshes
    let combined_vertices: Vec<Vec3> = mesh_a
        .vertices
        .iter()
        .chain(mesh_b.vertices.iter())
        .cloned()
        .collect();

    if combined_vertices.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    // Compute convex hull of all points
    compute_hull(&combined_vertices)
}

/// Simple Minkowski using convex hull as approximation
/// More accurate but computationally expensive implementation would use:
/// - For each vertex in A, add all vertices from B
/// - Compute convex hull of resulting point cloud
pub fn minkowski_multiple(meshes: &[&Mesh]) -> Mesh {
    if meshes.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    // Collect all vertices from all meshes
    let mut all_vertices: Vec<Vec3> = Vec::new();
    for mesh in meshes {
        all_vertices.extend(mesh.vertices.iter().cloned());
    }

    if all_vertices.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    // Compute convex hull of combined shape
    compute_hull(&all_vertices)
}

fn compute_hull(points: &[Vec3]) -> Mesh {
    compute_hull::compute_hull(points)
}

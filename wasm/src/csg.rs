/// Constructive Solid Geometry operations
/// Uses BSP trees for proper boolean operations
use crate::bsp::operations as bsp_ops;
use crate::geometry::Mesh;
use crate::hull;
use crate::math::{Mat4, Vec3};

/// Union: A + B
/// Simple union that combines vertices and indices
/// For non-overlapping meshes, this produces correct results
/// For overlapping meshes, internal faces remain (visual only, not watertight)
pub fn union(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
    let mut combined_vertices = mesh_a.vertices.clone();
    let mut combined_indices = mesh_a.indices.clone();

    // Offset indices for second mesh
    let offset = mesh_a.vertices.len() as u32;
    for idx in &mesh_b.indices {
        combined_indices.push(idx + offset);
    }

    combined_vertices.extend_from_slice(&mesh_b.vertices);

    Mesh::new(combined_vertices, combined_indices)
}

/// Difference: A - B
/// Subtracts mesh_b from mesh_a using BSP tree boolean operations
pub fn difference(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
    bsp_ops::difference(mesh_a, mesh_b)
}

/// Intersection: A ∩ B
/// Returns only the overlapping region of both meshes
pub fn intersection(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
    bsp_ops::intersection(mesh_a, mesh_b)
}

/// Transform a mesh by a 4x4 matrix
pub fn transform_mesh(mesh: &Mesh, matrix: &Mat4) -> Mesh {
    let transformed_vertices: Vec<Vec3> = mesh
        .vertices
        .iter()
        .map(|v| matrix.transform_point(*v))
        .collect();

    Mesh::new(transformed_vertices, mesh.indices.clone())
}

/// Translate a mesh
pub fn translate(mesh: &Mesh, x: f32, y: f32, z: f32) -> Mesh {
    let matrix = Mat4::translation(x, y, z);
    transform_mesh(mesh, &matrix)
}

/// Rotate a mesh around X axis (degrees)
pub fn rotate_x(mesh: &Mesh, angle: f32) -> Mesh {
    let matrix = Mat4::rotation_x(angle);
    transform_mesh(mesh, &matrix)
}

/// Rotate a mesh around Y axis (degrees)
pub fn rotate_y(mesh: &Mesh, angle: f32) -> Mesh {
    let matrix = Mat4::rotation_y(angle);
    transform_mesh(mesh, &matrix)
}

/// Rotate a mesh around Z axis (degrees)
pub fn rotate_z(mesh: &Mesh, angle: f32) -> Mesh {
    let matrix = Mat4::rotation_z(angle);
    transform_mesh(mesh, &matrix)
}

/// Scale a mesh
pub fn scale(mesh: &Mesh, sx: f32, sy: f32, sz: f32) -> Mesh {
    let matrix = Mat4::scale(sx, sy, sz);
    transform_mesh(mesh, &matrix)
}

/// Mirror a mesh across a plane
pub fn mirror_x(mesh: &Mesh) -> Mesh {
    scale(mesh, -1.0, 1.0, 1.0)
}

pub fn mirror_y(mesh: &Mesh) -> Mesh {
    scale(mesh, 1.0, -1.0, 1.0)
}

pub fn mirror_z(mesh: &Mesh) -> Mesh {
    scale(mesh, 1.0, 1.0, -1.0)
}

/// Apply a custom 4x4 transformation matrix
pub fn multmatrix(mesh: &Mesh, matrix_array: &[f32; 16]) -> Mesh {
    let matrix = Mat4 { m: *matrix_array };
    transform_mesh(mesh, &matrix)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_union_combines_meshes() {
        let m1 = Mesh::new(vec![Vec3::new(0.0, 0.0, 0.0)], vec![0]);
        let m2 = Mesh::new(vec![Vec3::new(1.0, 0.0, 0.0)], vec![0]);
        let result = union(&m1, &m2);
        assert_eq!(result.vertex_count(), 2);
    }
}

/// Compute minkowski sum of two meshes using convex hull approach
/// For each face in mesh A, add translated copy of mesh B
/// Then compute convex hull of all points
pub fn minkowski(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
    if mesh_a.vertices.is_empty() || mesh_b.vertices.is_empty() {
        return Mesh::new(vec![], vec![]);
    }

    // Strategy: For each face in A, add entire mesh B translated along that face's normal
    let mut expanded_vertices = Vec::new();

    // Add original mesh A vertices
    expanded_vertices.extend_from_slice(&mesh_a.vertices);

    // For each face in mesh A, translate mesh B along that face's normal
    let mesh_a_polys = bsp_ops::mesh_to_polygons(mesh_a);
    for poly_a in mesh_a_polys {
        let normal = poly_a.plane.normal;

        // Translate each vertex of mesh B by the normal (extrude it along the normal)
        let face_offset = normal.scale(0.001); // Small offset to avoid self-intersection
        for vertex_b in &mesh_b.vertices {
            expanded_vertices.push(vertex_b.add(normal).add(face_offset));
        }
    }

    // For each face in mesh B, add translated copy of mesh A
    // This ensures both shapes contribute to the minkowski sum
    let mesh_b_polys = bsp_ops::mesh_to_polygons(mesh_b);
    for poly_b in mesh_b_polys {
        let normal = poly_b.plane.normal;
        let face_offset = normal.scale(0.001);

        for vertex_a in &mesh_a.vertices {
            expanded_vertices.push(vertex_a.add(normal).add(face_offset));
        }
    }

    // Create convex hull of all expanded vertices
    hull::compute_hull(&Mesh::new(expanded_vertices, vec![]))
}

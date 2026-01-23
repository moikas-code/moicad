/// Constructive Solid Geometry operations
/// Uses BSP trees for proper boolean operations
use crate::bsp::operations as bsp_ops;
use crate::geometry::{Bounds, Mesh};
use crate::math::{Mat4, Vec3};

/// Union: A + B
/// Simple union that combines vertices and indices
/// For non-overlapping meshes, this produces correct results
/// For overlapping meshes, internal faces remain (visual only, not watertight)
pub fn union(mesh_a: &Mesh, mesh_b: &Mesh) -> Mesh {
    let total_vertices = mesh_a.vertices.len() + mesh_b.vertices.len();
    let total_indices = mesh_a.indices.len() + mesh_b.indices.len();

    // Pre-allocate with exact capacity needed
    let mut combined_vertices = Vec::with_capacity(total_vertices);
    let mut combined_indices = Vec::with_capacity(total_indices);

    // Copy first mesh
    combined_vertices.extend_from_slice(&mesh_a.vertices);
    combined_indices.extend_from_slice(&mesh_a.indices);

    // Offset indices for second mesh
    let offset = mesh_a.vertices.len() as u32;
    for idx in &mesh_b.indices {
        combined_indices.push(idx + offset);
    }

    // Add second mesh vertices
    combined_vertices.extend_from_slice(&mesh_b.vertices);

    Mesh::new(combined_vertices, combined_indices)
}

/// Memory-efficient union into existing mesh
pub fn union_into(target: &mut Mesh, additional: &Mesh) {
    let offset = target.vertices.len() as u32;

    // Offset new indices
    let offset_indices: Vec<u32> = additional.indices.iter().map(|&idx| idx + offset).collect();

    // Extend with new vertices and indices
    target.vertices.extend_from_slice(&additional.vertices);
    target.indices.extend_from_slice(&offset_indices);
    target.normals.extend_from_slice(&additional.normals);

    // Recalculate bounds
    for v in &additional.vertices {
        target.bounds.add_point(*v);
    }
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

    // Transform normals using inverse transpose matrix
    let normal_matrix = matrix.inverse_transpose();
    let transformed_normals: Vec<Vec3> = mesh
        .normals
        .iter()
        .map(|n| normal_matrix.transform_vector(*n).normalize())
        .collect();

    // Create mesh with transformed vertices and normals
    let mut result = Mesh {
        vertices: transformed_vertices,
        indices: mesh.indices.clone(),
        normals: transformed_normals,
        bounds: Bounds::new(),
    };

    // Recalculate bounds
    for v in &result.vertices {
        result.bounds.add_point(*v);
    }

    result
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
    let matrix = Mat4::from_array(matrix_array);
    transform_mesh(mesh, &matrix)
}

// In-place transformations for memory efficiency
pub fn transform_mesh_in_place(mesh: &mut Mesh, matrix: &Mat4) {
    // Transform vertices in place
    for vertex in &mut mesh.vertices {
        *vertex = matrix.transform_point(*vertex);
    }

    // Transform normals using inverse transpose matrix
    let normal_matrix = matrix.inverse_transpose();
    for normal in &mut mesh.normals {
        *normal = normal_matrix.transform_vector(*normal).normalize();
    }

    // Recalculate bounds
    mesh.bounds = Bounds::new();
    for v in &mesh.vertices {
        mesh.bounds.add_point(*v);
    }
}

/// Translate a mesh in place
pub fn translate_in_place(mesh: &mut Mesh, x: f32, y: f32, z: f32) {
    let matrix = Mat4::translation(x, y, z);
    transform_mesh_in_place(mesh, &matrix);
}

/// Rotate a mesh around X axis in place (degrees)
pub fn rotate_x_in_place(mesh: &mut Mesh, angle: f32) {
    let matrix = Mat4::rotation_x(angle);
    transform_mesh_in_place(mesh, &matrix);
}

/// Rotate a mesh around Y axis in place (degrees)
pub fn rotate_y_in_place(mesh: &mut Mesh, angle: f32) {
    let matrix = Mat4::rotation_y(angle);
    transform_mesh_in_place(mesh, &matrix);
}

/// Rotate a mesh around Z axis in place (degrees)
pub fn rotate_z_in_place(mesh: &mut Mesh, angle: f32) {
    let matrix = Mat4::rotation_z(angle);
    transform_mesh_in_place(mesh, &matrix);
}

/// Scale a mesh in place
pub fn scale_in_place(mesh: &mut Mesh, sx: f32, sy: f32, sz: f32) {
    let matrix = Mat4::scale(sx, sy, sz);
    transform_mesh_in_place(mesh, &matrix);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_union_combines_meshes() {
        let m1 = Mesh::new(vec![Vec3::new(0.0, 0.0, 0.0)], vec![0]);
        let m2 = Mesh::new(vec![Vec3::new(1.0, 1.0, 1.0)], vec![0]);

        let result = union(&m1, &m2);
        assert_eq!(result.vertex_count(), 2);
    }
}

mod bsp;
mod csg;
mod extrude;
mod geometry;
mod hull;
mod math;
mod primitives;

use geometry::Mesh;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WasmMesh {
    mesh: Mesh,
}

#[wasm_bindgen]
impl WasmMesh {
    #[wasm_bindgen(getter)]
    pub fn vertices(&self) -> Vec<f32> {
        self.mesh.to_vertices_array()
    }

    #[wasm_bindgen(getter)]
    pub fn indices(&self) -> Vec<u32> {
        self.mesh.to_indices_array()
    }

    #[wasm_bindgen(getter)]
    pub fn normals(&self) -> Vec<f32> {
        self.mesh.to_normals_array()
    }

    // Memory-efficient alternatives that don't allocate new Vecs
    #[wasm_bindgen]
    pub fn vertices_ptr(&self) -> *const f32 {
        self.mesh.vertices.as_ptr() as *const f32
    }

    #[wasm_bindgen]
    pub fn vertices_len(&self) -> usize {
        self.mesh.vertices.len() * 3 // 3 floats per Vec3
    }

    #[wasm_bindgen]
    pub fn indices_ptr(&self) -> *const u32 {
        self.mesh.indices.as_ptr()
    }

    #[wasm_bindgen]
    pub fn indices_len(&self) -> usize {
        self.mesh.indices.len()
    }

    #[wasm_bindgen]
    pub fn normals_ptr(&self) -> *const f32 {
        self.mesh.normals.as_ptr() as *const f32
    }

    #[wasm_bindgen]
    pub fn normals_len(&self) -> usize {
        self.mesh.normals.len() * 3 // 3 floats per Vec3
    }

    // Efficient copy to existing buffer
    #[wasm_bindgen]
    pub fn copy_vertices_to_buffer(&self, ptr: *mut f32, len: usize) {
        let vertices = &self.mesh.vertices;
        let copy_len = len.min(vertices.len());
        unsafe {
            let dst = std::slice::from_raw_parts_mut(ptr, copy_len * 3);
            // Convert Vec3 to flat f32 array
            for (i, vertex) in vertices.iter().take(copy_len).enumerate() {
                dst[i * 3] = vertex.x;
                dst[i * 3 + 1] = vertex.y;
                dst[i * 3 + 2] = vertex.z;
            }
        }
    }

    #[wasm_bindgen]
    pub fn copy_indices_to_buffer(&self, ptr: *mut u32, len: usize) {
        let indices = &self.mesh.indices;
        let copy_len = len.min(indices.len());
        unsafe {
            let dst = std::slice::from_raw_parts_mut(ptr, copy_len);
            dst.copy_from_slice(&indices[..copy_len]);
        }
    }

    #[wasm_bindgen]
    pub fn copy_normals_to_buffer(&self, ptr: *mut f32, len: usize) {
        let normals = &self.mesh.normals;
        let copy_len = len.min(normals.len());
        unsafe {
            let dst = std::slice::from_raw_parts_mut(ptr, copy_len * 3);
            // Convert Vec3 to flat f32 array
            for (i, normal) in normals.iter().take(copy_len).enumerate() {
                dst[i * 3] = normal.x;
                dst[i * 3 + 1] = normal.y;
                dst[i * 3 + 2] = normal.z;
            }
        }
    }

    #[wasm_bindgen]
    pub fn to_json(&self) -> String {
        serde_json::to_string(&self.mesh.to_json()).unwrap()
    }

    #[wasm_bindgen]
    pub fn vertex_count(&self) -> usize {
        self.mesh.vertex_count()
    }

    #[wasm_bindgen]
    pub fn face_count(&self) -> usize {
        self.mesh.face_count()
    }
}

// Primitive generators
#[wasm_bindgen]
pub fn create_cube(size: f32) -> WasmMesh {
    WasmMesh {
        mesh: primitives::cube(size),
    }
}

#[wasm_bindgen]
pub fn create_sphere(radius: f32, detail: u32) -> WasmMesh {
    WasmMesh {
        mesh: primitives::sphere(radius, detail),
    }
}

#[wasm_bindgen]
pub fn create_cylinder(radius: f32, height: f32, detail: u32) -> WasmMesh {
    WasmMesh {
        mesh: primitives::cylinder(radius, height, detail),
    }
}

#[wasm_bindgen]
pub fn create_cone(radius: f32, height: f32, detail: u32) -> WasmMesh {
    WasmMesh {
        mesh: primitives::cone(radius, height, detail),
    }
}

#[wasm_bindgen]
pub fn create_circle(radius: f32, detail: u32) -> WasmMesh {
    WasmMesh {
        mesh: primitives::circle(radius, detail),
    }
}

#[wasm_bindgen]
pub fn create_square(size: f32) -> WasmMesh {
    WasmMesh {
        mesh: primitives::square(size),
    }
}

#[wasm_bindgen]
pub fn create_polygon(points: Vec<f32>) -> WasmMesh {
    // Convert flat array to Vec2 points
    let mut polygon_points = Vec::new();
    for i in 0..points.len() / 2 {
        polygon_points.push(math::Vec2::new(points[i * 2], points[i * 2 + 1]));
    }

    WasmMesh {
        mesh: primitives::polygon(polygon_points, None),
    }
}

#[wasm_bindgen]
pub fn create_polyhedron(points: Vec<f32>) -> WasmMesh {
    // Create a simple tetrahedron from first 4 points
    if points.len() < 12 {
        return WasmMesh {
            mesh: primitives::cube(10.0),
        };
    }

    let mut vertices_3d = Vec::new();
    for i in 0..4 {
        vertices_3d.push(math::Vec3::new(
            points[i * 3],
            points[i * 3 + 1],
            points[i * 3 + 2],
        ));
    }

    let faces = vec![
        vec![0, 1, 2], // Base triangle
        vec![0, 2, 3], // Side triangles
        vec![0, 3, 1],
        vec![1, 3, 2],
    ];

    WasmMesh {
        mesh: primitives::polyhedron(vertices_3d, faces),
    }
}

// Extrusion Operations
#[wasm_bindgen]
pub fn linear_extrude(
    mesh: &WasmMesh,
    height: f32,
    twist: f32,
    scale: f32,
    slices: u32,
) -> WasmMesh {
    WasmMesh {
        mesh: extrude::linear_extrude(&mesh.mesh, height, twist, scale, slices),
    }
}

#[wasm_bindgen]
pub fn rotate_extrude(mesh: &WasmMesh, angle: f32, segments: u32) -> WasmMesh {
    WasmMesh {
        mesh: extrude::rotate_extrude(&mesh.mesh, angle, segments),
    }
}

// Transformations
#[wasm_bindgen]
pub fn translate(mesh: &WasmMesh, x: f32, y: f32, z: f32) -> WasmMesh {
    WasmMesh {
        mesh: csg::translate(&mesh.mesh, x, y, z),
    }
}

#[wasm_bindgen]
pub fn rotate_x(mesh: &WasmMesh, angle: f32) -> WasmMesh {
    WasmMesh {
        mesh: csg::rotate_x(&mesh.mesh, angle),
    }
}

#[wasm_bindgen]
pub fn rotate_y(mesh: &WasmMesh, angle: f32) -> WasmMesh {
    WasmMesh {
        mesh: csg::rotate_y(&mesh.mesh, angle),
    }
}

#[wasm_bindgen]
pub fn rotate_z(mesh: &WasmMesh, angle: f32) -> WasmMesh {
    WasmMesh {
        mesh: csg::rotate_z(&mesh.mesh, angle),
    }
}

#[wasm_bindgen]
pub fn rotate_axis(mesh: &WasmMesh, x: f32, y: f32, z: f32, angle: f32) -> WasmMesh {
    let axis = math::Vec3::new(x, y, z);
    let matrix = math::Mat4::rotation_axis_angle(axis, angle);
    WasmMesh {
        mesh: csg::transform_mesh(&mesh.mesh, &matrix),
    }
}

#[wasm_bindgen]
pub fn scale(mesh: &WasmMesh, sx: f32, sy: f32, sz: f32) -> WasmMesh {
    WasmMesh {
        mesh: csg::scale(&mesh.mesh, sx, sy, sz),
    }
}

#[wasm_bindgen]
pub fn mirror_x(mesh: &WasmMesh) -> WasmMesh {
    WasmMesh {
        mesh: csg::mirror_x(&mesh.mesh),
    }
}

#[wasm_bindgen]
pub fn mirror_y(mesh: &WasmMesh) -> WasmMesh {
    WasmMesh {
        mesh: csg::mirror_y(&mesh.mesh),
    }
}

#[wasm_bindgen]
pub fn mirror_z(mesh: &WasmMesh) -> WasmMesh {
    WasmMesh {
        mesh: csg::mirror_z(&mesh.mesh),
    }
}

#[wasm_bindgen]
pub fn multmatrix(mesh: &WasmMesh, matrix: Vec<f32>) -> WasmMesh {
    WasmMesh {
        mesh: csg::multmatrix(&mesh.mesh, &matrix),
    }
}

// CSG Operations
#[wasm_bindgen]
pub fn union(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    WasmMesh {
        mesh: csg::union(&a.mesh, &b.mesh),
    }
}

#[wasm_bindgen]
pub fn difference(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    WasmMesh {
        mesh: csg::difference(&a.mesh, &b.mesh),
    }
}

#[wasm_bindgen]
pub fn intersection(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    WasmMesh {
        mesh: csg::intersection(&a.mesh, &b.mesh),
    }
}

#[wasm_bindgen]
pub fn hull(mesh: &WasmMesh) -> WasmMesh {
    WasmMesh {
        mesh: hull::compute_hull(&mesh.mesh),
    }
}

#[wasm_bindgen]
pub fn hull_two(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    WasmMesh {
        mesh: hull::hull_meshes(&[&a.mesh, &b.mesh]),
    }
}

mod bsp;
mod csg;
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
    if matrix.len() != 16 {
        panic!("Matrix must have 16 elements");
    }
    let mut mat_array = [0.0; 16];
    mat_array.copy_from_slice(&matrix);
    WasmMesh {
        mesh: csg::multmatrix(&mesh.mesh, &mat_array),
    }
}

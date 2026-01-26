mod bsp;
mod color_utils;
mod csg;
mod extrude;
mod geometry;
mod hull;
mod math;
mod ops_2d;
mod primitives;
mod surface;
mod text;

use geometry::Mesh;
use math::Vec3;
use wasm_bindgen::prelude::*;

fn create_wasm_mesh(mesh: Mesh) -> WasmMesh {
    WasmMesh {
        mesh,
        color: None,
        modifier: None,
        object_id: None,
    }
}

fn create_wasm_mesh_with_color(mesh: Mesh, color: Option<[f32; 4]>) -> WasmMesh {
    WasmMesh {
        mesh,
        color,
        modifier: None,
        object_id: None,
    }
}

fn create_wasm_mesh_with_modifier(
    mesh: Mesh,
    color: Option<[f32; 4]>,
    modifier: Option<String>,
    object_id: Option<String>,
) -> WasmMesh {
    WasmMesh {
        mesh,
        color,
        modifier,
        object_id,
    }
}

#[wasm_bindgen]
pub struct WasmMesh {
    mesh: Mesh,
    color: Option<[f32; 4]>,   // RGBA color (0-1 range)
    modifier: Option<String>,  // OpenSCAD modifier: "!", "%", "#", "*"
    object_id: Option<String>, // Unique identifier for highlighting
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

    #[wasm_bindgen]
    pub fn get_color(&self) -> Option<Vec<f32>> {
        self.color.map(|c| c.to_vec())
    }

    #[wasm_bindgen]
    pub fn get_modifier(&self) -> Option<String> {
        self.modifier.clone()
    }

    #[wasm_bindgen]
    pub fn get_object_id(&self) -> Option<String> {
        self.object_id.clone()
    }

    #[wasm_bindgen]
    pub fn set_modifier(&mut self, modifier: Option<String>) {
        self.modifier = modifier;
    }

    #[wasm_bindgen]
    pub fn set_object_id(&mut self, object_id: Option<String>) {
        self.object_id = object_id;
    }
}

// Primitive generators
#[wasm_bindgen]
pub fn create_cube(size: f32) -> WasmMesh {
    create_wasm_mesh(primitives::cube(size))
}

#[wasm_bindgen]
pub fn create_sphere(radius: f32, detail: u32) -> WasmMesh {
    create_wasm_mesh(primitives::sphere(radius, detail))
}

// Surface generator
// Surface generator
#[wasm_bindgen]
pub fn create_surface(
    width: usize,
    depth: usize,
    data: &[f32],
    center: bool,
    invert: bool,
) -> WasmMesh {
    // Simple test: return a basic square
    let vertices = vec![
        Vec3::new(0.0, 0.0, 0.0), // (0,0)
        Vec3::new(1.0, 0.0, 0.0), // (1,0)
        Vec3::new(0.0, 1.0, 0.0), // (0,1)
        Vec3::new(1.0, 1.0, 0.0), // (1,1)
    ];

    let indices = vec![0, 1, 2, 1, 3, 2];

    let mesh = Mesh::new(vertices, indices);
    create_wasm_mesh(mesh)
}

#[wasm_bindgen]
pub fn create_surface_from_string(
    width: usize,
    depth: usize,
    data_str: &str,
    center: bool,
    invert: bool,
) -> WasmMesh {
    let surface_result =
        surface::create_surface_from_string(width, depth, data_str, center, invert);

    // Copy indices directly
    let indices = surface_result.indices;

    // Vertices are already in Vec<Vec3> format
    let vertices = surface_result.vertices;

    // Create mesh with proper constructor
    let mesh = Mesh::new(vertices, indices);

    create_wasm_mesh(mesh)
}

#[wasm_bindgen]
pub fn create_cylinder(radius: f32, height: f32, detail: u32) -> WasmMesh {
    create_wasm_mesh(primitives::cylinder(radius, height, detail))
}

#[wasm_bindgen]
pub fn create_cone(radius: f32, height: f32, detail: u32) -> WasmMesh {
    create_wasm_mesh(primitives::cone(radius, height, detail))
}

#[wasm_bindgen]
pub fn create_circle(radius: f32, detail: u32) -> WasmMesh {
    create_wasm_mesh(primitives::circle(radius, detail))
}

#[wasm_bindgen]
pub fn create_square(size: f32) -> WasmMesh {
    create_wasm_mesh(primitives::square(size))
}

// CSG Operations
#[wasm_bindgen]
pub fn union(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    let result_mesh = csg::union(&a.mesh, &b.mesh);
    // Preserve color and modifier from first mesh if available
    create_wasm_mesh_with_modifier(
        result_mesh,
        a.color,
        a.modifier.clone(),
        a.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn difference(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    let result_mesh = csg::difference(&a.mesh, &b.mesh);
    // Preserve color and modifier from first mesh if available
    create_wasm_mesh_with_modifier(
        result_mesh,
        a.color,
        a.modifier.clone(),
        a.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn intersection(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    let result_mesh = csg::intersection(&a.mesh, &b.mesh);
    // Preserve color and modifier from first mesh if available
    create_wasm_mesh_with_modifier(
        result_mesh,
        a.color,
        a.modifier.clone(),
        a.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn hull(mesh: &WasmMesh) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        hull::compute_hull(&mesh.mesh),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn hull_two(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    let result_mesh = hull::hull_meshes(&[&a.mesh, &b.mesh]);
    // Preserve color and modifier from first mesh if available
    create_wasm_mesh_with_modifier(
        result_mesh,
        a.color,
        a.modifier.clone(),
        a.object_id.clone(),
    )
}

// Color operations
#[wasm_bindgen]
pub fn set_color(mesh: &WasmMesh, r: f32, g: f32, b: f32, a: Option<f32>) -> WasmMesh {
    let alpha = a.unwrap_or(1.0);
    let color = [r, g, b, alpha];
    create_wasm_mesh_with_color(mesh.mesh.clone(), Some(color))
}

// Transformations
#[wasm_bindgen]
pub fn translate(mesh: &WasmMesh, x: f32, y: f32, z: f32) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        csg::translate(&mesh.mesh, x, y, z),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn rotate_x(mesh: &WasmMesh, angle: f32) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        csg::rotate_x(&mesh.mesh, angle),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn rotate_y(mesh: &WasmMesh, angle: f32) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        csg::rotate_y(&mesh.mesh, angle),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn rotate_z(mesh: &WasmMesh, angle: f32) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        csg::rotate_z(&mesh.mesh, angle),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn scale(mesh: &WasmMesh, sx: f32, sy: f32, sz: f32) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        csg::scale(&mesh.mesh, sx, sy, sz),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn mirror_x(mesh: &WasmMesh) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        csg::mirror_x(&mesh.mesh),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn mirror_y(mesh: &WasmMesh) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        csg::mirror_y(&mesh.mesh),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn mirror_z(mesh: &WasmMesh) -> WasmMesh {
    create_wasm_mesh_with_modifier(
        csg::mirror_z(&mesh.mesh),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn multmatrix(mesh: &WasmMesh, matrix: Vec<f32>) -> WasmMesh {
    if matrix.len() != 16 {
        panic!("Matrix must have 16 elements");
    }
    let mut mat_array = [0.0; 16];
    mat_array.copy_from_slice(&matrix);
    create_wasm_mesh_with_modifier(
        csg::multmatrix(&mesh.mesh, &mat_array),
        mesh.color,
        mesh.modifier.clone(),
        mesh.object_id.clone(),
    )
}

#[wasm_bindgen]
pub fn polygon(points: Vec<f32>) -> WasmMesh {
    if points.len() % 2 != 0 {
        panic!("Points array must have even number of elements (x,y pairs)");
    }

    let num_points = points.len() / 2;
    let mut vec2_points = Vec::with_capacity(num_points);

    for i in 0..num_points {
        let x = points[i * 2];
        let y = points[i * 2 + 1];
        vec2_points.push(math::Vec2::new(x, y));
    }

    create_wasm_mesh(primitives::polygon(&vec2_points))
}

#[wasm_bindgen]
pub fn minkowski(a: &WasmMesh, b: &WasmMesh) -> WasmMesh {
    let result_mesh = csg::minkowski(&a.mesh, &b.mesh);
    // Preserve color from first mesh if available
    create_wasm_mesh_with_color(result_mesh, a.color)
}

#[wasm_bindgen]
pub fn polyhedron(points: Vec<f32>, faces: Vec<u32>) -> WasmMesh {
    if points.len() % 3 != 0 {
        panic!("Points array must have multiple of 3 elements (x,y,z triples)");
    }

    let num_points = points.len() / 3;
    let mut vec3_points = Vec::with_capacity(num_points);

    for i in 0..num_points {
        let x = points[i * 3];
        let y = points[i * 3 + 1];
        let z = points[i * 3 + 2];
        vec3_points.push(math::Vec3::new(x, y, z));
    }

    // Parse faces - each face starts with count, then vertex indices
    let mut parsed_faces = Vec::new();
    let mut i = 0;
    while i < faces.len() {
        if i >= faces.len() {
            break;
        }
        let count = faces[i] as usize;
        if i + count >= faces.len() {
            break;
        }
        let face_vertices: Vec<usize> = faces[i + 1..=i + count]
            .iter()
            .map(|&idx| idx as usize)
            .collect();
        parsed_faces.push(face_vertices);
        i += count + 1;
    }

    create_wasm_mesh(primitives::polyhedron(&vec3_points, &parsed_faces))
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
    create_wasm_mesh_with_color(
        extrude::linear_extrude(&mesh.mesh, height, twist, scale, slices),
        mesh.color,
    )
}

#[wasm_bindgen]
pub fn rotate_extrude(mesh: &WasmMesh, angle: f32, segments: u32) -> WasmMesh {
    create_wasm_mesh_with_color(
        extrude::rotate_extrude(&mesh.mesh, angle, segments),
        mesh.color,
    )
}

// Text primitive
#[wasm_bindgen]
pub fn create_text(text: String, size: f32) -> WasmMesh {
    create_wasm_mesh(text::create_text(&text, size))
}

#[wasm_bindgen]
pub fn create_text_3d(text: String, size: f32, depth: f32) -> WasmMesh {
    create_wasm_mesh(text::create_text_3d(&text, size, depth))
}

// 2D operations
#[wasm_bindgen]
pub fn offset(mesh: &WasmMesh, delta: f32, chamfer: bool) -> WasmMesh {
    create_wasm_mesh_with_color(
        ops_2d::offset_polygon(&mesh.mesh.vertices, delta, chamfer),
        mesh.color,
    )
}

#[wasm_bindgen]
pub fn resize(mesh: &WasmMesh, new_size: Vec<f32>, auto: bool) -> WasmMesh {
    if new_size.len() != 2 {
        panic!("Resize requires exactly 2 dimensions: [width, height]");
    }
    create_wasm_mesh_with_color(
        ops_2d::resize_2d(&mesh.mesh.vertices, [new_size[0], new_size[1]], auto),
        mesh.color,
    )
}

// Color parsing utilities
#[wasm_bindgen]
pub fn parse_color_string(color_str: String) -> Vec<f32> {
    match color_utils::parse_color_string(&color_str) {
        Some([r, g, b, a]) => vec![r, g, b, a],
        None => vec![],
    }
}

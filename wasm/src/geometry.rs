/// Mesh and geometry data structures
use crate::math::Vec3;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Bounds {
    pub min: [f32; 3],
    pub max: [f32; 3],
}

impl Bounds {
    pub fn new() -> Self {
        Bounds {
            min: [f32::INFINITY; 3],
            max: [f32::NEG_INFINITY; 3],
        }
    }

    pub fn add_point(&mut self, p: Vec3) {
        self.min[0] = self.min[0].min(p.x);
        self.min[1] = self.min[1].min(p.y);
        self.min[2] = self.min[2].min(p.z);

        self.max[0] = self.max[0].max(p.x);
        self.max[1] = self.max[1].max(p.y);
        self.max[2] = self.max[2].max(p.z);
    }

    pub fn volume(&self) -> f32 {
        let dx = self.max[0] - self.min[0];
        let dy = self.max[1] - self.min[1];
        let dz = self.max[2] - self.min[2];
        (dx * dy * dz).max(0.0)
    }
}

/// 3D Mesh representation
#[derive(Clone, Debug)]
pub struct Mesh {
    pub vertices: Vec<Vec3>,
    pub indices: Vec<u32>,
    pub normals: Vec<Vec3>,
    pub bounds: Bounds,
}

impl Mesh {
    pub fn new(vertices: Vec<Vec3>, indices: Vec<u32>) -> Self {
        let vertex_count = vertices.len();
        let mut bounds = Bounds::new();
        for v in &vertices {
            bounds.add_point(*v);
        }

        let mut mesh = Mesh {
            vertices,
            indices,
            normals: Vec::with_capacity(vertex_count),
            bounds,
        };

        mesh.calculate_normals();
        mesh
    }

    // Create mesh with pre-allocated capacity
    pub fn with_capacity(vertex_capacity: usize, index_capacity: usize) -> Self {
        Mesh {
            vertices: Vec::with_capacity(vertex_capacity),
            indices: Vec::with_capacity(index_capacity),
            normals: Vec::with_capacity(vertex_capacity),
            bounds: Bounds::new(),
        }
    }

    // Reserve additional capacity without reallocating
    pub fn reserve(&mut self, additional_vertices: usize, additional_indices: usize) {
        self.vertices.reserve(additional_vertices);
        self.indices.reserve(additional_indices);
        self.normals.reserve(additional_vertices);
    }

    pub fn calculate_normals(&mut self) {
        // Initialize normals to zero
        self.normals = vec![Vec3::zero(); self.vertices.len()];

        // Calculate face normals and accumulate to vertex normals
        for i in (0..self.indices.len()).step_by(3) {
            if i + 2 < self.indices.len() {
                let i0 = self.indices[i] as usize;
                let i1 = self.indices[i + 1] as usize;
                let i2 = self.indices[i + 2] as usize;

                let v0 = self.vertices[i0];
                let v1 = self.vertices[i1];
                let v2 = self.vertices[i2];

                let edge1 = v1.subtract(v0);
                let edge2 = v2.subtract(v0);
                let face_normal = edge1.cross(edge2).normalize();

                self.normals[i0] = self.normals[i0].add(face_normal);
                self.normals[i1] = self.normals[i1].add(face_normal);
                self.normals[i2] = self.normals[i2].add(face_normal);
            }
        }

        // Normalize the accumulated normals
        for normal in &mut self.normals {
            *normal = normal.normalize();
        }
    }

    pub fn transform(&self, transform_fn: impl Fn(Vec3) -> Vec3) -> Mesh {
        let mut new_vertices = Vec::new();
        let mut new_bounds = Bounds::new();

        for v in &self.vertices {
            let transformed = transform_fn(*v);
            new_bounds.add_point(transformed);
            new_vertices.push(transformed);
        }

        let mut mesh = Mesh {
            vertices: new_vertices,
            indices: self.indices.clone(),
            normals: self.normals.clone(),
            bounds: new_bounds,
        };

        mesh.calculate_normals();
        mesh
    }

    pub fn vertex_count(&self) -> usize {
        self.vertices.len()
    }

    pub fn face_count(&self) -> usize {
        self.indices.len() / 3
    }

    pub fn to_vertices_array(&self) -> Vec<f32> {
        let mut arr = Vec::new();
        for v in &self.vertices {
            arr.push(v.x);
            arr.push(v.y);
            arr.push(v.z);
        }
        arr
    }

    pub fn to_normals_array(&self) -> Vec<f32> {
        let mut arr = Vec::new();
        for n in &self.normals {
            arr.push(n.x);
            arr.push(n.y);
            arr.push(n.z);
        }
        arr
    }

    pub fn to_indices_array(&self) -> Vec<u32> {
        self.indices.clone()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MeshJson {
    pub vertices: Vec<f32>,
    pub indices: Vec<u32>,
    pub normals: Vec<f32>,
    pub bounds: Bounds,
    pub stats: MeshStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MeshStats {
    pub vertex_count: usize,
    pub face_count: usize,
    pub volume: f32,
}

impl Mesh {
    pub fn to_json(&self) -> MeshJson {
        MeshJson {
            vertices: self.to_vertices_array(),
            indices: self.indices.clone(),
            normals: self.to_normals_array(),
            bounds: self.bounds.clone(),
            stats: MeshStats {
                vertex_count: self.vertex_count(),
                face_count: self.face_count(),
                volume: self.bounds.volume(),
            },
        }
    }
}

/// Memory pool for temporary Vec allocations
pub struct VecPool<T> {
    pool: Vec<Vec<T>>,
}

impl<T: Clone> VecPool<T> {
    pub fn new() -> Self {
        VecPool { pool: Vec::new() }
    }

    pub fn get(&mut self) -> Vec<T> {
        self.pool.pop().unwrap_or_else(|| Vec::new())
    }

    pub fn return_vec(&mut self, mut vec: Vec<T>) {
        vec.clear();
        self.pool.push(vec);
    }

    pub fn with_capacity(&mut self, capacity: usize) -> Vec<T> {
        if let Some(mut vec) = self.pool.pop() {
            vec.reserve(capacity.saturating_sub(vec.capacity()));
            vec
        } else {
            Vec::with_capacity(capacity)
        }
    }
}

// Global memory pools for common types
thread_local! {
    static VEC3_POOL: std::cell::RefCell<VecPool<Vec3>> = std::cell::RefCell::new(VecPool::new());
    static U32_POOL: std::cell::RefCell<VecPool<u32>> = std::cell::RefCell::new(VecPool::new());
}

pub fn with_vec3_pool<R>(f: impl FnOnce(&mut VecPool<Vec3>) -> R) -> R {
    VEC3_POOL.with(|pool| f(&mut pool.borrow_mut()))
}

pub fn with_u32_pool<R>(f: impl FnOnce(&mut VecPool<u32>) -> R) -> R {
    U32_POOL.with(|pool| f(&mut pool.borrow_mut()))
}

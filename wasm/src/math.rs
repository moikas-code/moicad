/// Matrix and vector math utilities for CAD operations
use std::f32::consts::PI;

/// 3D Vector
#[derive(Clone, Copy, Debug)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Vec3 { x, y, z }
    }

    pub fn zero() -> Self {
        Vec3 {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
    }

    pub fn add(&self, other: Vec3) -> Vec3 {
        Vec3 {
            x: self.x + other.x,
            y: self.y + other.y,
            z: self.z + other.z,
        }
    }

    pub fn subtract(&self, other: Vec3) -> Vec3 {
        Vec3 {
            x: self.x - other.x,
            y: self.y - other.y,
            z: self.z - other.z,
        }
    }

    pub fn scale(&self, factor: f32) -> Vec3 {
        Vec3 {
            x: self.x * factor,
            y: self.y * factor,
            z: self.z * factor,
        }
    }

    pub fn dot(&self, other: Vec3) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(&self, other: Vec3) -> Vec3 {
        Vec3 {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }

    pub fn length(&self) -> f32 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }

    pub fn normalize(&self) -> Vec3 {
        let len = self.length();
        if len > 0.0 {
            self.scale(1.0 / len)
        } else {
            Vec3::zero()
        }
    }
}

/// 4x4 Matrix for transformations
#[derive(Clone, Copy, Debug)]
pub struct Mat4 {
    pub m: [f32; 16],
}

impl Mat4 {
    pub fn identity() -> Self {
        Mat4 {
            m: [
                1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
            ],
        }
    }

    /// Translation matrix (column-major format)
    pub fn translation(x: f32, y: f32, z: f32) -> Self {
        Mat4 {
            m: [
                1.0, 0.0, 0.0, 0.0, // column 0
                0.0, 1.0, 0.0, 0.0, // column 1
                0.0, 0.0, 1.0, 0.0, // column 2
                x, y, z, 1.0, // column 3 (translation)
            ],
        }
    }

    /// Scale matrix (column-major format)
    pub fn scale(sx: f32, sy: f32, sz: f32) -> Self {
        Mat4 {
            m: [
                sx, 0.0, 0.0, 0.0, // column 0
                0.0, sy, 0.0, 0.0, // column 1
                0.0, 0.0, sz, 0.0, // column 2
                0.0, 0.0, 0.0, 1.0, // column 3
            ],
        }
    }

    /// Rotation around X axis (in degrees, column-major format)
    pub fn rotation_x(angle_deg: f32) -> Self {
        let angle = angle_deg * PI / 180.0;
        let c = angle.cos();
        let s = angle.sin();

        Mat4 {
            m: [
                1.0, 0.0, 0.0, 0.0, // column 0
                0.0, c, s, 0.0, // column 1
                0.0, -s, c, 0.0, // column 2
                0.0, 0.0, 0.0, 1.0, // column 3
            ],
        }
    }

    /// Rotation around Y axis (in degrees, column-major format)
    pub fn rotation_y(angle_deg: f32) -> Self {
        let angle = angle_deg * PI / 180.0;
        let c = angle.cos();
        let s = angle.sin();

        Mat4 {
            m: [
                c, 0.0, -s, 0.0, // column 0
                0.0, 1.0, 0.0, 0.0, // column 1
                s, 0.0, c, 0.0, // column 2
                0.0, 0.0, 0.0, 1.0, // column 3
            ],
        }
    }

    /// Rotation around Z axis (in degrees, column-major format)
    pub fn rotation_z(angle_deg: f32) -> Self {
        let angle = angle_deg * PI / 180.0;
        let c = angle.cos();
        let s = angle.sin();

        Mat4 {
            m: [
                c, s, 0.0, 0.0, // column 0
                -s, c, 0.0, 0.0, // column 1
                0.0, 0.0, 1.0, 0.0, // column 2
                0.0, 0.0, 0.0, 1.0, // column 3
            ],
        }
    }

    pub fn multiply(&self, other: Mat4) -> Self {
        let mut result = [0.0; 16];
        for i in 0..4 {
            for j in 0..4 {
                let mut sum = 0.0;
                for k in 0..4 {
                    // Column-major indexing: element at row i, col j is at index i + j*4
                    sum += self.m[i + k * 4] * other.m[k + j * 4];
                }
                result[i + j * 4] = sum;
            }
        }
        Mat4 { m: result }
    }

    pub fn transform_point(&self, p: Vec3) -> Vec3 {
        let x = self.m[0] * p.x + self.m[4] * p.y + self.m[8] * p.z + self.m[12];
        let y = self.m[1] * p.x + self.m[5] * p.y + self.m[9] * p.z + self.m[13];
        let z = self.m[2] * p.x + self.m[6] * p.y + self.m[10] * p.z + self.m[14];
        Vec3::new(x, y, z)
    }

    pub fn transform_vector(&self, v: Vec3) -> Vec3 {
        let x = self.m[0] * v.x + self.m[4] * v.y + self.m[8] * v.z;
        let y = self.m[1] * v.x + self.m[5] * v.y + self.m[9] * v.z;
        let z = self.m[2] * v.x + self.m[6] * v.y + self.m[10] * v.z;
        Vec3::new(x, y, z)
    }

    /// Compute inverse transpose for normal transformation
    /// For affine transformations, normals should be transformed by (M^-1)^T
    pub fn inverse_transpose(&self) -> Mat4 {
        // For now, implement a simple inverse for common transformations
        // This handles translation, rotation, scale, but not general 4x4
        // TODO: Implement full matrix inversion for general transformations

        // Extract the 3x3 rotation/scale part
        let mut inv = Mat4::identity();
        let det = self.m[0] * (self.m[5] * self.m[10] - self.m[6] * self.m[9])
            - self.m[4] * (self.m[1] * self.m[10] - self.m[2] * self.m[9])
            + self.m[8] * (self.m[1] * self.m[6] - self.m[2] * self.m[5]);

        if det.abs() < 1e-6 {
            // Degenerate matrix, return identity
            return Mat4::identity();
        }

        let inv_det = 1.0 / det;

        // Compute inverse of 3x3 part
        inv.m[0] = (self.m[5] * self.m[10] - self.m[6] * self.m[9]) * inv_det;
        inv.m[1] = (self.m[2] * self.m[9] - self.m[1] * self.m[10]) * inv_det;
        inv.m[2] = (self.m[1] * self.m[6] - self.m[2] * self.m[5]) * inv_det;

        inv.m[4] = (self.m[6] * self.m[8] - self.m[4] * self.m[10]) * inv_det;
        inv.m[5] = (self.m[0] * self.m[10] - self.m[2] * self.m[8]) * inv_det;
        inv.m[6] = (self.m[2] * self.m[4] - self.m[0] * self.m[6]) * inv_det;

        inv.m[8] = (self.m[4] * self.m[9] - self.m[5] * self.m[8]) * inv_det;
        inv.m[9] = (self.m[1] * self.m[8] - self.m[0] * self.m[9]) * inv_det;
        inv.m[10] = (self.m[0] * self.m[5] - self.m[1] * self.m[4]) * inv_det;

        // Transpose the result (since we want (M^-1)^T)
        let mut result = Mat4 { m: inv.m };
        result.transpose();
        result
    }

    /// Transpose the matrix (swap rows and columns)
    pub fn transpose(&mut self) {
        let m = self.m;
        self.m = [
            m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3], m[7],
            m[11], m[15],
        ];
    }

    /// Create rotation matrix for arbitrary axis rotation (Rodrigues' formula)
    pub fn rotation_axis_angle(axis: Vec3, angle_degrees: f32) -> Mat4 {
        let angle = angle_degrees * PI / 180.0;
        let cos_a = angle.cos();
        let sin_a = angle.sin();
        let one_minus_cos = 1.0 - cos_a;

        let axis = axis.normalize();
        let x = axis.x;
        let y = axis.y;
        let z = axis.z;

        // Rodrigues' rotation matrix
        Mat4 {
            m: [
                cos_a + x * x * one_minus_cos,
                x * y * one_minus_cos - z * sin_a,
                x * z * one_minus_cos + y * sin_a,
                0.0,
                y * x * one_minus_cos + z * sin_a,
                cos_a + y * y * one_minus_cos,
                y * z * one_minus_cos - x * sin_a,
                0.0,
                z * x * one_minus_cos - y * sin_a,
                z * y * one_minus_cos + x * sin_a,
                cos_a + z * z * one_minus_cos,
                0.0,
                0.0,
                0.0,
                0.0,
                1.0,
            ],
        }
    }
}

/// 2D Vector
#[derive(Debug, Clone, Copy)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    pub fn new(x: f32, y: f32) -> Self {
        Vec2 { x, y }
    }
}

/// Convert array to Vec3
pub fn vec3_from_array(arr: &[f32; 3]) -> Vec3 {
    Vec3::new(arr[0], arr[1], arr[2])
}

/// Convert Vec3 to array
pub fn vec3_to_array(v: Vec3) -> [f32; 3] {
    [v.x, v.y, v.z]
}

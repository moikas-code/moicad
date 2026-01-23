/// 3D Vector and Matrix math operations
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

    pub fn zero() -> Vec3 {
        Vec3::new(0.0, 0.0, 0.0)
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

    pub fn scale(&self, factor: f32) -> Vec3 {
        Vec3::new(self.x * factor, self.y * factor, self.z * factor)
    }

    pub fn dot(&self, other: Vec3) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(&self, other: Vec3) -> Vec3 {
        Vec3::new(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )
    }
}

/// 2D Vector
#[derive(Clone, Copy, Debug)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    pub fn new(x: f32, y: f32) -> Self {
        Vec2 { x, y }
    }
}

/// 4x4 Matrix for transformations
#[derive(Clone, Copy, Debug)]
pub struct Mat4 {
    pub m: [f32; 16],
}

impl Mat4 {
    pub fn new() -> Mat4 {
        Mat4 {
            m: [
                1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
            ],
        }
    }

    pub fn identity() -> Mat4 {
        Mat4::new()
    }

    pub fn translation(x: f32, y: f32, z: f32) -> Mat4 {
        Mat4 {
            m: [
                1.0, 0.0, 0.0, x, 0.0, 1.0, 0.0, y, 0.0, 0.0, 1.0, z, 0.0, 0.0, 0.0, 1.0,
            ],
        }
    }

    pub fn rotation_x(angle: f32) -> Mat4 {
        let angle = angle * PI / 180.0;
        let cos_a = angle.cos();
        let sin_a = angle.sin();
        Mat4 {
            m: [
                1.0, 0.0, 0.0, 0.0, 0.0, cos_a, -sin_a, 0.0, 0.0, sin_a, cos_a, 0.0, 0.0, 0.0, 0.0,
                1.0,
            ],
        }
    }

    pub fn rotation_y(angle: f32) -> Mat4 {
        let angle = angle * PI / 180.0;
        let cos_a = angle.cos();
        let sin_a = angle.sin();
        Mat4 {
            m: [
                cos_a, 0.0, sin_a, 0.0, 0.0, 1.0, 0.0, 0.0, -sin_a, 0.0, cos_a, 0.0, 0.0, 0.0, 0.0,
                1.0,
            ],
        }
    }

    pub fn rotation_z(angle: f32) -> Mat4 {
        let angle = angle * PI / 180.0;
        let cos_a = angle.cos();
        let sin_a = angle.sin();
        Mat4 {
            m: [
                cos_a, sin_a, 0.0, 0.0, -sin_a, cos_a, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0,
                1.0,
            ],
        }
    }

    pub fn scale(sx: f32, sy: f32, sz: f32) -> Mat4 {
        Mat4 {
            m: [
                sx, 0.0, 0.0, 0.0, 0.0, sy, 0.0, 0.0, 0.0, 0.0, sz, 0.0, 0.0, 0.0, 0.0, 1.0,
            ],
        }
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
                x * y * one_minus_cos + z * sin_a,
                cos_a + z * z * one_minus_cos,
                0.0,
                0.0,
                0.0,
                0.0,
                1.0,
            ],
        }
    }

    /// Create 4x4 matrix from array
    pub fn from_array(array: &[f32; 16]) -> Mat4 {
        Mat4 {
            m: [
                array[0], array[1], array[2], array[3], array[4], array[5], array[6], array[7],
                array[8], array[9], array[10], array[11], array[12], array[13], array[14],
                array[15],
            ],
        }
    }

    pub fn transform_point(&self, point: Vec3) -> Vec3 {
        Vec3::new(
            self.m[0] * point.x + self.m[1] * point.y + self.m[2] * point.z + self.m[3],
            self.m[4] * point.x + self.m[5] * point.y + self.m[6] * point.z + self.m[7],
            self.m[8] * point.x + self.m[9] * point.y + self.m[10] * point.z + self.m[11],
            self.m[12] * point.x + self.m[13] * point.y + self.m[14] * point.z + self.m[15],
        )
    }

    pub fn inverse(&self) -> Option<Mat4> {
        // For now, implement a simple inverse for common transformations
        // This handles translation, rotation, scale but not general 4x4 matrices
        let det = self.m[0]
            * (self.m[5] * self.m[10] * self.m[15] - self.m[6] * self.m[9] * self.m[14])
            - self.m[1]
                * (self.m[4] * self.m[10] * self.m[14] - self.m[5] * self.m[9] * self.m[13])
            + self.m[2]
                * (self.m[4] * self.m[11] * self.m[14] - self.m[8] * self.m[7] * self.m[13])
            - self.m[3]
                * (self.m[4] * self.m[7] * self.m[15] - self.m[5] * self.m[11] * self.m[14]);

        if det.abs() < 1e-6 {
            return None;
        }

        let inv_det = 1.0 / det;
        let mut result = Mat4::new();

        result.m[0] =
            inv_det * (self.m[5] * self.m[10] * self.m[15] - self.m[6] * self.m[9] * self.m[14]);
        result.m[1] =
            inv_det * (self.m[1] * self.m[10] * self.m[14] - self.m[5] * self.m[9] * self.m[13]);
        result.m[2] =
            inv_det * (self.m[1] * self.m[6] * self.m[15] - self.m[2] * self.m[9] * self.m[13]);
        result.m[3] =
            inv_det * (self.m[1] * self.m[2] * self.m[15] - self.m[0] * self.m[8] * self.m[13]);
        result.m[4] =
            inv_det * (self.m[4] * self.m[9] * self.m[14] - self.m[5] * self.m[8] * self.m[12]);
        result.m[5] =
            inv_det * (self.m[4] * self.m[11] * self.m[14] - self.m[1] * self.m[10] * self.m[13]);
        result.m[6] =
            inv_det * (self.m[0] * self.m[10] * self.m[14] - self.m[2] * self.m[6] * self.m[15]);
        result.m[7] =
            inv_det * (self.m[0] * self.m[9] * self.m[14] - self.m[1] * self.m[2] * self.m[15]);
        result.m[8] =
            inv_det * (self.m[2] * self.m[7] * self.m[15] - self.m[6] * self.m[11] * self.m[13]);
        result.m[9] =
            inv_det * (self.m[0] * self.m[11] * self.m[14] - self.m[1] * self.m[10] * self.m[15]);
        result.m[10] =
            inv_det * (self.m[3] * self.m[11] * self.m[14] - self.m[2] * self.m[8] * self.m[12]);
        result.m[11] =
            inv_det * (self.m[7] * self.m[11] * self.m[14] - self.m[6] * self.m[9] * self.m[13]);
        result.m[12] =
            inv_det * (self.m[0] * self.m[8] * self.m[14] - self.m[4] * self.m[12] * self.m[15]);
        result.m[13] =
            inv_det * (self.m[5] * self.m[9] * self.m[14] - self.m[1] * self.m[10] * self.m[15]);
        result.m[14] =
            inv_det * (self.m[6] * self.m[9] * self.m[14] - self.m[2] * self.m[8] * self.m[13]);
        result.m[15] =
            inv_det * (self.m[0] * self.m[2] * self.m[15] - self.m[3] * self.m[8] * self.m[12]);

        Some(result)
    }

    pub fn inverse_transpose(&self) -> Mat4 {
        // For now, implement a simple inverse for common transformations
        // This handles translation, rotation, scale but not general 4x4 matrices
        let det = self.m[0]
            * (self.m[5] * self.m[10] * self.m[15] - self.m[6] * self.m[9] * self.m[14])
            - self.m[1]
                * (self.m[4] * self.m[10] * self.m[14] - self.m[5] * self.m[9] * self.m[13])
            + self.m[2]
                * (self.m[4] * self.m[11] * self.m[14] - self.m[8] * self.m[7] * self.m[13])
            - self.m[3] * (self.m[1] * self.m[2] * self.m[15] - self.m[0] * self.m[8] * self.m[13]);

        if det.abs() < 1e-6 {
            return Mat4::new();
        }

        let inv_det = 1.0 / det;
        let mut result = Mat4::new();

        result.m[0] =
            inv_det * (self.m[5] * self.m[10] * self.m[15] - self.m[6] * self.m[9] * self.m[14]);
        result.m[1] =
            inv_det * (self.m[1] * self.m[10] * self.m[14] - self.m[5] * self.m[9] * self.m[13]);
        result.m[2] =
            inv_det * (self.m[1] * self.m[6] * self.m[15] - self.m[2] * self.m[9] * self.m[13]);
        result.m[3] =
            inv_det * (self.m[1] * self.m[2] * self.m[15] - self.m[0] * self.m[8] * self.m[13]);
        result.m[4] =
            inv_det * (self.m[4] * self.m[9] * self.m[14] - self.m[5] * self.m[8] * self.m[12]);
        result.m[5] =
            inv_det * (self.m[4] * self.m[11] * self.m[14] - self.m[1] * self.m[10] * self.m[13]);
        result.m[6] =
            inv_det * (self.m[0] * self.m[10] * self.m[14] - self.m[2] * self.m[6] * self.m[15]);
        result.m[7] =
            inv_det * (self.m[0] * self.m[9] * self.m[14] - self.m[1] * self.m[2] * self.m[15]);
        result.m[8] =
            inv_det * (self.m[2] * self.m[7] * self.m[15] - self.m[6] * self.m[11] * self.m[13]);
        result.m[9] =
            inv_det * (self.m[0] * self.m[11] * self.m[14] - self.m[1] * self.m[10] * self.m[15]);
        result.m[10] =
            inv_det * (self.m[3] * self.m[11] * self.m[14] - self.m[2] * self.m[8] * self.m[12]);
        result.m[11] =
            inv_det * (self.m[7] * self.m[11] * self.m[14] - self.m[6] * self.m[9] * self.m[13]);
        result.m[12] =
            inv_det * (self.m[0] * self.m[8] * self.m[14] - self.m[4] * self.m[12] * self.m[15]);
        result.m[13] =
            inv_det * (self.m[5] * self.m[9] * self.m[14] - self.m[1] * self.m[10] * self.m[15]);
        result.m[14] =
            inv_det * (self.m[6] * self.m[9] * self.m[14] - self.m[2] * self.m[8] * self.m[13]);
        result.m[15] =
            inv_det * (self.m[0] * self.m[2] * self.m[15] - self.m[3] * self.m[8] * self.m[13]);

        result
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

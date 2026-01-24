/// Matrix and vector math utilities for CAD operations
use std::f32::consts::PI;

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
                    sum += self.m[i * 4 + k] * other.m[k * 4 + j];
                }
                result[i * 4 + j] = sum;
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
}

/// Convert array to Vec3
pub fn vec3_from_array(arr: &[f32; 3]) -> Vec3 {
    Vec3::new(arr[0], arr[1], arr[2])
}

/// Convert Vec3 to array
pub fn vec3_to_array(v: Vec3) -> [f32; 3] {
    [v.x, v.y, v.z]
}

use crate::math::Vec3;
use lyon_tessellation::{
    FillTessellator, FillOptions, VertexBuffers,
    geometry_builder::simple_builder, path::Path,
};
use ttf_parser::{Face, GlyphId, OutlineBuilder};

/// Builder that converts ttf-parser outline to lyon path
struct PathBuilder {
    builder: lyon_tessellation::path::Builder,
    scale: f32,
}

impl PathBuilder {
    fn new(scale: f32) -> Self {
        PathBuilder {
            builder: Path::builder(),
            scale,
        }
    }
    
    fn finish(self) -> Path {
        self.builder.build()
    }
    
    fn scale_point(&self, x: f32, y: f32) -> (f32, f32) {
        (x * self.scale, -y * self.scale) // Flip Y axis
    }
}

impl OutlineBuilder for PathBuilder {
    fn move_to(&mut self, x: f32, y: f32) {
        let (x, y) = self.scale_point(x, y);
        self.builder.begin(lyon_tessellation::math::Point::new(x, y));
    }
    
    fn line_to(&mut self, x: f32, y: f32) {
        let (x, y) = self.scale_point(x, y);
        self.builder.line_to(lyon_tessellation::math::Point::new(x, y));
    }
    
    fn quad_to(&mut self, x1: f32, y1: f32, x: f32, y: f32) {
        let (x1, y1) = self.scale_point(x1, y1);
        let (x, y) = self.scale_point(x, y);
        self.builder.quadratic_bezier_to(
            lyon_tessellation::math::Point::new(x1, y1),
            lyon_tessellation::math::Point::new(x, y),
        );
    }
    
    fn curve_to(&mut self, x1: f32, y1: f32, x2: f32, y2: f32, x: f32, y: f32) {
        let (x1, y1) = self.scale_point(x1, y1);
        let (x2, y2) = self.scale_point(x2, y2);
        let (x, y) = self.scale_point(x, y);
        self.builder.cubic_bezier_to(
            lyon_tessellation::math::Point::new(x1, y1),
            lyon_tessellation::math::Point::new(x2, y2),
            lyon_tessellation::math::Point::new(x, y),
        );
    }
    
    fn close(&mut self) {
        self.builder.end(true);
    }
}

/// Tessellate a glyph outline into triangles
pub fn tessellate_glyph(
    face: &Face,
    glyph_id: GlyphId,
    size: f32,
) -> Option<(Vec<Vec3>, Vec<u32>)> {
    // Calculate scale factor
    let units_per_em = face.units_per_em() as f32;
    let scale = size / units_per_em;
    
    // Build path from glyph outline
    let mut path_builder = PathBuilder::new(scale);
    face.outline_glyph(glyph_id, &mut path_builder)?;
    let path = path_builder.finish();
    
    // Tessellate path to triangles (lyon uses u16 indices)
    let mut buffers: VertexBuffers<lyon_tessellation::math::Point, u16> = VertexBuffers::new();
    let mut tessellator = FillTessellator::new();
    
    tessellator
        .tessellate_path(
            &path,
            &FillOptions::default(),
            &mut simple_builder(&mut buffers),
        )
        .ok()?;
    
    // Convert to our Vec3 format
    let vertices: Vec<Vec3> = buffers
        .vertices
        .iter()
        .map(|p| Vec3::new(p.x, p.y, 0.0))
        .collect();
    
    // Convert u16 indices to u32
    let indices: Vec<u32> = buffers.indices.iter().map(|&i| i as u32).collect();
    
    Some((vertices, indices))
}

/// Calculate the width of a glyph in the given size
pub fn glyph_width(face: &Face, glyph_id: GlyphId, size: f32) -> f32 {
    if let Some(advance) = face.glyph_hor_advance(glyph_id) {
        let units_per_em = face.units_per_em() as f32;
        let scale = size / units_per_em;
        advance as f32 * scale
    } else {
        size * 0.6 // Fallback
    }
}

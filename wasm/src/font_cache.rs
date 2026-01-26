use ttf_parser::{Face, GlyphId};
use std::sync::OnceLock;

/// Embedded Liberation Sans font data
const LIBERATION_SANS_DATA: &[u8] = include_bytes!("../fonts/LiberationSans-Regular.ttf");

/// Global font cache
static FONT_CACHE: OnceLock<FontCache> = OnceLock::new();

pub struct FontCache {
    default_face: Face<'static>,
}

impl FontCache {
    fn new() -> Self {
        let default_face = Face::parse(LIBERATION_SANS_DATA, 0)
            .expect("Failed to parse embedded Liberation Sans font");
        
        FontCache { default_face }
    }
    
    pub fn get() -> &'static FontCache {
        FONT_CACHE.get_or_init(|| FontCache::new())
    }
    
    pub fn default_face(&self) -> &Face<'static> {
        &self.default_face
    }
    
    /// Get glyph ID for a character
    pub fn glyph_id(&self, ch: char) -> Option<GlyphId> {
        self.default_face.glyph_index(ch)
    }
    
    /// Get horizontal advance for a glyph
    pub fn glyph_advance(&self, glyph_id: GlyphId) -> Option<u16> {
        self.default_face.glyph_hor_advance(glyph_id)
    }
    
    /// Get units per em (for scaling)
    pub fn units_per_em(&self) -> u16 {
        self.default_face.units_per_em()
    }
}

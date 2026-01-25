// Color parsing and utilities for OpenSCAD color() function
// Supports CSS named colors, hex colors, and RGB values

use std::collections::HashMap;

/// Parse color from various formats and return normalized RGBA [r, g, b, a]
/// All values returned in 0.0-1.0 range for consistency with vector colors
pub fn parse_color_string(color_str: &str) -> Option<[f32; 4]> {
    let trimmed = color_str.trim().to_lowercase();
    
    // Try hex colors first
    if let Some(rgba) = parse_hex_color(&trimmed) {
        return Some(rgba);
    }
    
    // Try named colors
    if let Some(rgba) = get_named_color(&trimmed) {
        return Some(rgba);
    }
    
    None
}

/// Parse hex color: #RRGGBB, #RGB, #RRGGBBAA
fn parse_hex_color(hex: &str) -> Option<[f32; 4]> {
    if !hex.starts_with('#') {
        return None;
    }
    
    let hex_body = &hex[1..];
    
    match hex_body.len() {
        3 => parse_short_hex(hex_body),    // #RGB
        6 => parse_long_hex(hex_body),     // #RRGGBB  
        8 => parse_long_hex_alpha(hex_body), // #RRGGBBAA
        _ => None,
    }
}

/// Parse #RGB format (each digit duplicated)
fn parse_short_hex(hex: &str) -> Option<[f32; 4]> {
    if hex.len() != 3 {
        return None;
    }
    
    let mut chars = hex.chars();
    let r = parse_hex_digit(chars.next()?)?;
    let g = parse_hex_digit(chars.next()?)?;
    let b = parse_hex_digit(chars.next()?)?;
    
    let r_val = r * 16.0 + r;
    let g_val = g * 16.0 + g;
    let b_val = b * 16.0 + b;
    
    Some([r_val, g_val, b_val, 1.0])
}

/// Parse #RRGGBB format
fn parse_long_hex(hex: &str) -> Option<[f32; 4]> {
    if hex.len() != 6 {
        return None;
    }
    
    let r = parse_hex_byte(&hex[0..2])?;
    let g = parse_hex_byte(&hex[2..4])?;
    let b = parse_hex_byte(&hex[4..6])?;
    
    Some([r, g, b, 1.0])
}

/// Parse #RRGGBBAA format  
fn parse_long_hex_alpha(hex: &str) -> Option<[f32; 4]> {
    if hex.len() != 8 {
        return None;
    }
    
    let r = parse_hex_byte(&hex[0..2])?;
    let g = parse_hex_byte(&hex[2..4])?;
    let b = parse_hex_byte(&hex[4..6])?;
    let a = parse_hex_byte(&hex[6..8])?;
    
    Some([r, g, b, a])
}

/// Parse single hex digit (0-F) to 0.0-1.0 range
fn parse_hex_digit(c: char) -> Option<f32> {
    match c {
        '0'..='9' => Some((c as u8 - b'0') as f32),
        'a'..='f' => Some((c as u8 - b'a' + 10) as f32),
        _ => None,
    }
}

/// Parse hex byte (00-FF) to 0.0-1.0 range
fn parse_hex_byte(hex_byte: &str) -> Option<f32> {
    if hex_byte.len() != 2 {
        return None;
    }
    
    let high = parse_hex_digit(hex_byte.chars().next()?)?;
    let low = parse_hex_digit(hex_byte.chars().nth(1)?)?;
    
    Some((high * 16.0 + low) / 255.0)
}

/// Get named CSS color with full RGB values
fn get_named_color(name: &str) -> Option<[f32; 4]> {
    let color_map = get_css_color_map();
    color_map.get(name).copied()
}

/// Create HashMap of CSS named colors
/// Includes all 140+ standard CSS color names
fn get_css_color_map() -> HashMap<&'static str, [f32; 4]> {
    let mut colors = HashMap::new();
    
    // Primary colors
    colors.insert("black",   [0.0, 0.0, 0.0, 1.0]);
    colors.insert("white",   [1.0, 1.0, 1.0, 1.0]);
    colors.insert("red",     [1.0, 0.0, 0.0, 1.0]);
    colors.insert("green",   [0.0, 0.5, 0.0, 1.0]);
    colors.insert("blue",    [0.0, 0.0, 1.0, 1.0]);
    
    // Secondary colors
    colors.insert("yellow",  [1.0, 1.0, 0.0, 1.0]);
    colors.insert("cyan",    [0.0, 1.0, 1.0, 1.0]);
    colors.insert("magenta", [1.0, 0.0, 1.0, 1.0]);
    
    // Gray scale
    colors.insert("gray",    [0.502, 0.502, 0.502, 1.0]);
    colors.insert("grey",    [0.502, 0.502, 0.502, 1.0]);
    colors.insert("silver",  [0.753, 0.753, 0.753, 1.0]);
    colors.insert("lightgray", [0.827, 0.827, 0.827, 1.0]);
    colors.insert("lightgrey", [0.827, 0.827, 0.827, 1.0]);
    colors.insert("darkgray",  [0.267, 0.267, 0.267, 1.0]);
    colors.insert("darkgrey",  [0.267, 0.267, 0.267, 1.0]);
    
    // Extended colors
    colors.insert("maroon",     [0.502, 0.0,   0.0,   1.0]);
    colors.insert("olive",      [0.502, 0.502, 0.0,   1.0]);
    colors.insert("navy",       [0.0,   0.0,   0.502, 1.0]);
    colors.insert("purple",     [0.502, 0.0,   0.502, 1.0]);
    colors.insert("teal",       [0.0,   0.502, 0.502, 1.0]);
    colors.insert("lime",       [0.0,   1.0,   0.0,   1.0]);
    colors.insert("aqua",       [0.0,   1.0,   1.0,   1.0]);
    colors.insert("fuchsia",    [1.0,   0.0,   1.0,   1.0]);
    
    // Modern web colors
    colors.insert("aliceblue",       [0.941, 0.973, 1.0,   1.0]);
    colors.insert("antiquewhite",    [0.98,  0.922, 0.843, 1.0]);
    colors.insert("aqua",           [0.0,   1.0,   1.0,   1.0]);
    colors.insert("aquamarine",      [0.498, 1.0,   0.831, 1.0]);
    colors.insert("azure",           [0.941, 1.0,   1.0,   1.0]);
    colors.insert("beige",           [0.961, 0.961, 0.863, 1.0]);
    colors.insert("bisque",          [1.0,   0.894, 0.769, 1.0]);
    colors.insert("blanchedalmond",  [1.0,   0.922, 0.804, 1.0]);
    colors.insert("blue",            [0.0,   0.0,   1.0,   1.0]);
    colors.insert("blueviolet",      [0.541, 0.169, 0.886, 1.0]);
    colors.insert("brown",           [0.647, 0.165, 0.165, 1.0]);
    colors.insert("burlywood",        [0.871, 0.722, 0.529, 1.0]);
    colors.insert("cadetblue",       [0.373, 0.62,  0.627, 1.0]);
    colors.insert("chartreuse",       [0.498, 1.0,   0.0,   1.0]);
    colors.insert("chocolate",       [0.824, 0.412, 0.118, 1.0]);
    colors.insert("coral",           [1.0,   0.498, 0.314, 1.0]);
    colors.insert("cornflowerblue",  [0.392, 0.584, 0.929, 1.0]);
    colors.insert("cornsilk",        [1.0,   0.973, 0.863, 1.0]);
    colors.insert("crimson",         [0.863, 0.078, 0.235, 1.0]);
    colors.insert("cyan",            [0.0,   1.0,   1.0,   1.0]);
    colors.insert("darkblue",         [0.0,   0.0,   0.545, 1.0]);
    colors.insert("darkcyan",        [0.0,   0.545, 0.545, 1.0]);
    colors.insert("darkgoldenrod",   [0.722, 0.525, 0.043, 1.0]);
    colors.insert("darkgray",        [0.663, 0.663, 0.663, 1.0]);
    colors.insert("darkgreen",       [0.0,   0.392, 0.0,   1.0]);
    colors.insert("darkgrey",        [0.663, 0.663, 0.663, 1.0]);
    colors.insert("darkkhaki",       [0.741, 0.718, 0.42,  1.0]);
    colors.insert("darkmagenta",     [0.545, 0.0,   0.545, 1.0]);
    colors.insert("darkolivegreen",  [0.333, 0.42,  0.184, 1.0]);
    colors.insert("darkorange",      [1.0,   0.549, 0.0,   1.0]);
    colors.insert("darkorchid",      [0.6,   0.196, 0.8,   1.0]);
    colors.insert("darkred",         [0.545, 0.0,   0.0,   1.0]);
    colors.insert("darksalmon",      [0.914, 0.588, 0.478, 1.0]);
    colors.insert("darkseagreen",    [0.176, 0.514, 0.322, 1.0]);
    colors.insert("darkslateblue",   [0.282, 0.239, 0.545, 1.0]);
    colors.insert("darkslategray",   [0.184, 0.31,  0.31,  1.0]);
    colors.insert("darkslategrey",   [0.184, 0.31,  0.31,  1.0]);
    colors.insert("darkturquoise",   [0.0,   0.808, 0.82,  1.0]);
    colors.insert("darkviolet",      [0.58,  0.0,   0.827, 1.0]);
    colors.insert("deeppink",        [1.0,   0.078, 0.576, 1.0]);
    colors.insert("deepskyblue",      [0.0,   0.749, 1.0,   1.0]);
    colors.insert("dimgray",         [0.412, 0.412, 0.412, 1.0]);
    colors.insert("dimgrey",         [0.412, 0.412, 0.412, 1.0]);
    colors.insert("dodgerblue",      [0.118, 0.565, 1.0,   1.0]);
    colors.insert("firebrick",       [0.698, 0.133, 0.133, 1.0]);
    colors.insert("floralwhite",     [1.0,   0.98,  0.941, 1.0]);
    colors.insert("forestgreen",      [0.133, 0.545, 0.133, 1.0]);
    colors.insert("fuchsia",         [1.0,   0.0,   1.0,   1.0]);
    colors.insert("gainsboro",        [0.863, 0.863, 0.863, 1.0]);
    colors.insert("ghostwhite",      [0.973, 0.973, 1.0,   1.0]);
    colors.insert("gold",            [1.0,   0.843, 0.0,   1.0]);
    colors.insert("goldenrod",       [0.855, 0.647, 0.125, 1.0]);
    colors.insert("gray",            [0.502, 0.502, 0.502, 1.0]);
    colors.insert("green",           [0.0,   0.502, 0.0,   1.0]);
    colors.insert("grey",            [0.502, 0.502, 0.502, 1.0]);
    colors.insert("honeydew",        [0.941, 1.0,   0.941, 1.0]);
    colors.insert("hotpink",         [1.0,   0.412, 0.706, 1.0]);
    colors.insert("indianred",       [0.804, 0.361, 0.361, 1.0]);
    colors.insert("indigo",          [0.294, 0.0,   0.51,  1.0]);
    colors.insert("ivory",           [1.0,   1.0,   0.941, 1.0]);
    colors.insert("khaki",           [0.941, 0.902, 0.549, 1.0]);
    colors.insert("lavender",         [0.902, 0.902, 0.980, 1.0]);
    colors.insert("lavenderblush",   [1.0,   0.941, 0.961, 1.0]);
    colors.insert("lawngreen",       [0.486, 0.988, 0.0,   1.0]);
    colors.insert("lemonchiffon",    [1.0,   0.98,  0.804, 1.0]);
    colors.insert("lightblue",        [0.678, 0.847, 0.902, 1.0]);
    colors.insert("lightcoral",      [0.941, 0.502, 0.502, 1.0]);
    colors.insert("lightcyan",        [0.878, 1.0,   1.0,   1.0]);
    colors.insert("lightgoldenrodyellow", [1.0,   0.980, 0.576, 1.0]);
    colors.insert("lightgray",        [0.827, 0.827, 0.827, 1.0]);
    colors.insert("lightgreen",       [0.565, 0.933, 0.565, 1.0]);
    colors.insert("lightgrey",        [0.827, 0.827, 0.827, 1.0]);
    colors.insert("lightpink",        [1.0,   0.714, 0.757, 1.0]);
    colors.insert("lightsalmon",      [1.0,   0.627, 0.478, 1.0]);
    colors.insert("lightseagreen",    [0.125, 0.698, 0.667, 1.0]);
    colors.insert("lightskyblue",     [0.529, 0.808, 0.980, 1.0]);
    colors.insert("lightslategray",   [0.467, 0.533, 0.6,   1.0]);
    colors.insert("lightslategrey",   [0.467, 0.533, 0.6,   1.0]);
    colors.insert("lightsteelblue",  [0.69,  0.769, 0.871, 1.0]);
    colors.insert("lightyellow",      [1.0,   1.0,   0.878, 1.0]);
    colors.insert("lime",            [0.0,   1.0,   0.0,   1.0]);
    colors.insert("limegreen",        [0.196, 0.804, 0.196, 1.0]);
    colors.insert("linen",           [0.980, 0.941, 0.902, 1.0]);
    colors.insert("magenta",         [1.0,   0.0,   1.0,   1.0]);
    colors.insert("maroon",          [0.502, 0.0,   0.0,   1.0]);
    colors.insert("mediumaquamarine", [0.4,   0.804, 0.667, 1.0]);
    colors.insert("mediumblue",      [0.0,   0.0,   0.804, 1.0]);
    colors.insert("mediumorchid",    [0.729, 0.333, 0.827, 1.0]);
    colors.insert("mediumpurple",    [0.576, 0.439, 0.859, 1.0]);
    colors.insert("mediumseagreen",  [0.235, 0.702, 0.443, 1.0]);
    colors.insert("mediumslateblue", [0.482, 0.408, 0.933, 1.0]);
    colors.insert("mediumspringgreen", [0.0,   0.980, 0.604, 1.0]);
    colors.insert("mediumturquoise", [0.282, 0.82,  0.8,   1.0]);
    colors.insert("mediumvioletred", [0.780, 0.082, 0.522, 1.0]);
    colors.insert("midnightblue",    [0.098, 0.098, 0.439, 1.0]);
    colors.insert("mintcream",       [0.980, 1.0,   0.980, 1.0]);
    colors.insert("mistyrose",       [1.0,   0.894, 0.882, 1.0]);
    colors.insert("moccasin",        [1.0,   0.894, 0.706, 1.0]);
    colors.insert("navajowhite",    [1.0,   0.871, 0.678, 1.0]);
    colors.insert("navy",            [0.0,   0.0,   0.502, 1.0]);
    colors.insert("oldlace",         [0.992, 0.961, 0.902, 1.0]);
    colors.insert("olive",           [0.502, 0.502, 0.0,   1.0]);
    colors.insert("olivedrab",        [0.42,  0.557, 0.137, 1.0]);
    colors.insert("orange",          [1.0,   0.647, 0.0,   1.0]);
    colors.insert("orangered",       [1.0,   0.271, 0.0,   1.0]);
    colors.insert("orchid",          [0.855, 0.439, 0.839, 1.0]);
    colors.insert("palegoldenrod",   [0.933, 0.91,  0.667, 1.0]);
    colors.insert("palegreen",        [0.596, 0.984, 0.596, 1.0]);
    colors.insert("paleturquoise",   [0.686, 0.933, 0.933, 1.0]);
    colors.insert("palevioletred",   [0.859, 0.439, 0.576, 1.0]);
    colors.insert("papayawhip",      [1.0,   0.937, 0.835, 1.0]);
    colors.insert("peachpuff",       [1.0,   0.855, 0.725, 1.0]);
    colors.insert("peru",            [0.804, 0.522, 0.247, 1.0]);
    colors.insert("pink",            [1.0,   0.753, 0.796, 1.0]);
    colors.insert("plum",            [0.867, 0.627, 0.867, 1.0]);
    colors.insert("powderblue",      [0.69,  0.878, 0.902, 1.0]);
    colors.insert("purple",          [0.502, 0.0,   0.502, 1.0]);
    colors.insert("red",             [1.0,   0.0,   0.0,   1.0]);
    colors.insert("rosybrown",       [0.737, 0.561, 0.561, 1.0]);
    colors.insert("royalblue",       [0.255, 0.412, 0.882, 1.0]);
    colors.insert("saddlebrown",     [0.647, 0.165, 0.165, 1.0]);
    colors.insert("salmon",          [0.980, 0.502, 0.447, 1.0]);
    colors.insert("sandybrown",      [0.957, 0.643, 0.376, 1.0]);
    colors.insert("seagreen",        [0.18,  0.545, 0.341, 1.0]);
    colors.insert("seashell",        [1.0,   0.961, 0.933, 1.0]);
    colors.insert("sienna",          [0.627, 0.322, 0.176, 1.0]);
    colors.insert("silver",          [0.753, 0.753, 0.753, 1.0]);
    colors.insert("skyblue",         [0.529, 0.808, 0.922, 1.0]);
    colors.insert("slateblue",       [0.416, 0.353, 0.804, 1.0]);
    colors.insert("slategray",       [0.439, 0.502, 0.565, 1.0]);
    colors.insert("slategrey",       [0.439, 0.502, 0.565, 1.0]);
    colors.insert("snow",            [1.0,   0.98,  1.0,   1.0]);
    colors.insert("springgreen",     [0.0,   1.0,   0.498, 1.0]);
    colors.insert("steelblue",       [0.275, 0.51,  0.706, 1.0]);
    colors.insert("tan",             [0.824, 0.706, 0.549, 1.0]);
    colors.insert("teal",            [0.0,   0.502, 0.502, 1.0]);
    colors.insert("thistle",         [0.847, 0.749, 0.847, 1.0]);
    colors.insert("tomato",          [1.0,   0.388, 0.278, 1.0]);
    colors.insert("turquoise",       [0.251, 0.878, 0.816, 1.0]);
    colors.insert("violet",          [0.933, 0.51,  0.933, 1.0]);
    colors.insert("wheat",           [0.961, 0.871, 0.702, 1.0]);
    colors.insert("white",           [1.0,   1.0,   1.0,   1.0]);
    colors.insert("whitesmoke",      [0.961, 0.961, 0.961, 1.0]);
    colors.insert("yellow",          [1.0,   1.0,   0.0,   1.0]);
    colors.insert("yellowgreen",     [0.604, 0.804, 0.196, 1.0]);
    
    colors
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_color_parsing() {
        assert_eq!(parse_hex_color("#FF0000"), Some([1.0, 0.0, 0.0, 1.0]));
        assert_eq!(parse_hex_color("#F00"), Some([1.0, 1.0, 0.0, 0.0, 1.0]));
        assert_eq!(parse_hex_color("#FF000080"), Some([1.0, 0.0, 0.0, 0.502]));
        assert_eq!(parse_hex_color("#invalid"), None);
    }

    #[test]
    fn test_named_colors() {
        assert_eq!(get_named_color("red"), Some([1.0, 0.0, 0.0, 1.0]));
        assert_eq!(get_named_color("steelblue"), Some([0.275, 0.51, 0.706, 1.0]));
        assert_eq!(get_named_color("nonexistent"), None);
    }

    #[test]
    fn test_case_insensitivity() {
        assert_eq!(get_named_color("RED"), Some([1.0, 0.0, 0.0, 1.0]));
        assert_eq!(get_named_color("SteelBlue"), Some([0.275, 0.51, 0.706, 1.0]));
        assert_eq!(get_named_color("rEd"), Some([1.0, 0.0, 0.0, 1.0]));
    }
}
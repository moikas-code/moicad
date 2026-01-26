/*
 * Fidget Toy DSA Keycap Generator
 * Based on KeyV2 library principles by rsheldiii
 * Optimized for fidget toy use (no actual switch stem needed)
 *
 * DSA Profile: Uniform height (~7.39mm), spherical dish, no sculpting
 * Perfect for fidget toys due to its consistent feel across all keys
 *
 * Author: Generated for Moikas (moikas.com)
 * License: GPL-3.0 (same as KeyV2)
 */

/* [Basic Key Settings] */
// Key unit width (1 = standard key, 1.25 = ctrl/alt, 1.5 = tab, etc)
key_units = 1; // [0.5:0.25:6.25]

// Key unit height (usually 1 for most keys)
key_units_height = 1; // [0.5:0.25:2]

// Standard key spacing in mm (19.05mm is standard Cherry MX spacing)
unit_size = 19.05;

/* [DSA Profile Dimensions] */
// Base width/height for 1u key (18.16mm standard)
base_width = 18.16;
base_height = 18.16;

// Top width difference from base (how much smaller top is)
top_width_diff = 6;
top_height_diff = 6;

// Total keycap height (DSA standard is ~7.39mm)
total_depth = 7.39;

// Wall thickness (1.5mm each side = 3mm total)
wall_thickness = 1.5;

/* [Dish Settings] */
// Dish type: "spherical" for DSA, "cylindrical" for other profiles
dish_type = "flat"; // [spherical, cylindrical, flat]

// Dish depth (how deep the concave top is)
dish_depth = 1;

// Dish radius for spherical dish
dish_radius = 22;

/* [Stem Settings - For Fidget Toys] */
// Enable stem (turn off for flat-bottom fidget pieces)
enable_stem = true;

// Cherry MX stem
stem_type = "cherry"; // [cherry, alps, choc, none]

// Stem slop/tolerance (increase if too tight, 0.3 is good for FDM)
stem_slop = 0.1;

// Stem inset from bottom of keycap
stem_inset = 0;

/* [Fidget Toy Options] */
// Add a solid base instead of hollow (good for fidget toys)
solid_base = false;

// Base thickness when solid_base is enabled
solid_base_thickness = 2;

// Add texture to top (for tactile fidgeting)
add_texture = false;

// Texture type
texture_type = "dots"; // [dots, lines, grid]

/* [Legend/Text Settings] */
// Add text to keycap
enable_legend = false;

// Legend text
legend_text = "F";

// Legend font size
legend_size = 5;

// Legend font
legend_font = "Arial:style=Bold";

// Legend depth (negative = inset, positive = raised)
legend_depth = -0.5;

/* [Rendering Quality] */
$fn = 69; // Smoothness (increase for final render, decrease for preview)

/* ==================== MODULES ==================== */

// Calculate actual dimensions based on unit size
function actual_width() = base_width + (key_units - 1) * unit_size;
function actual_height() = base_height + (key_units_height - 1) * unit_size;

// DSA Profile - spherical top with uniform shape
module dsa_keycap_shape() {
    bottom_width = actual_width();
    bottom_height = actual_height();
    top_width = bottom_width - top_width_diff;
    top_height = bottom_height - top_height_diff;

    // Create the basic keycap shell using hull between bottom and top
    difference() {
        // Outer shell
        hull() {
            // Bottom rounded rectangle
            linear_extrude(height=0.01)
                offset(r=1)
                    square([bottom_width-2, bottom_height-2], center=true);

            // Top rounded rectangle (smaller, elevated)
            translate([0, 0, total_depth])
                linear_extrude(height=0.01)
                    offset(r=1.5)
                        square([top_width-3, top_height-3], center=true);
        }

        // Hollow out the inside (unless solid base)
        if (!solid_base) {
            translate([0, 0, -0.1])
            hull() {
                // Bottom inner
                linear_extrude(height=0.01)
                    offset(r=0.5)
                        square([bottom_width - wall_thickness*2 - 1,
                                bottom_height - wall_thickness*2 - 1], center=true);

                // Top inner (follows outer taper)
                translate([0, 0, total_depth - wall_thickness])
                    linear_extrude(height=0.01)
                        offset(r=1)
                            square([top_width - wall_thickness*2 - 2,
                                    top_height - wall_thickness*2 - 2], center=true);
            }
        } else {
            // For solid base, only hollow out above the base thickness
            translate([0, 0, solid_base_thickness])
            hull() {
                linear_extrude(height=0.01)
                    offset(r=0.5)
                        square([bottom_width - wall_thickness*2 - 1,
                                bottom_height - wall_thickness*2 - 1], center=true);

                translate([0, 0, total_depth - solid_base_thickness - wall_thickness])
                    linear_extrude(height=0.01)
                        offset(r=1)
                            square([top_width - wall_thickness*2 - 2,
                                    top_height - wall_thickness*2 - 2], center=true);
            }
        }

        // Dish (spherical cutout on top)
        if (dish_type == "spherical") {
            translate([0, 0, total_depth + dish_radius - dish_depth])
                sphere(r=dish_radius);
        } else if (dish_type == "cylindrical") {
            translate([0, 0, total_depth + dish_radius - dish_depth])
                rotate([90, 0, 0])
                    cylinder(h=bottom_height*2, r=dish_radius, center=true);
        }
        // "flat" = no dish cutout

        // Legend cutout (if enabled and inset)
        if (enable_legend && legend_depth < 0) {
            translate([0, 0, total_depth - abs(legend_depth) + 0.5])
                linear_extrude(height=abs(legend_depth) + 1)
                    text(legend_text, size=legend_size, font=legend_font,
                         halign="center", valign="center");
        }
    }

    // Raised legend (if enabled and positive depth)
    if (enable_legend && legend_depth > 0) {
        translate([0, 0, total_depth - dish_depth/2])
            linear_extrude(height=legend_depth)
                text(legend_text, size=legend_size, font=legend_font,
                     halign="center", valign="center");
    }

    // Add texture if enabled
    if (add_texture) {
        add_top_texture();
    }
}

// Cherry MX stem (cross-shaped)
module cherry_stem() {
    stem_height = 6.15; // Standard Cherry MX stem height
    cross_length = 4.0 + stem_slop;
    cross_width = 1.1 + stem_slop;
    outer_diameter = 5.5;

    difference() {
        // Outer cylinder
        cylinder(h=stem_height, d=outer_diameter, center=false);

        // Cross cutout
        translate([0, 0, -0.1]) {
            // Vertical part of cross
            cube([cross_width, cross_length, stem_height + 0.2], center=true);
            // Horizontal part of cross
            cube([cross_length, cross_width, stem_height + 0.2], center=true);
        }
    }
}

// Alps stem (rectangle)
module alps_stem() {
    stem_height = 4;
    alps_width = 4.45 + stem_slop;
    alps_length = 2.25 + stem_slop;

    difference() {
        cylinder(h=stem_height, d=6, center=false);
        translate([0, 0, -0.1])
            cube([alps_width, alps_length, stem_height + 0.2], center=true);
    }
}

// Kailh Choc stem (two small posts)
module choc_stem() {
    stem_height = 3;
    post_diameter = 1.2 + stem_slop;
    post_spacing = 5.7;

    translate([-post_spacing/2, 0, 0])
        cylinder(h=stem_height, d=3, center=false);
    translate([post_spacing/2, 0, 0])
        cylinder(h=stem_height, d=3, center=false);
}

// Texture patterns for fidget toys
module add_top_texture() {
    top_width = actual_width() - top_width_diff;
    top_height = actual_height() - top_height_diff;

    if (texture_type == "dots") {
        // Grid of small raised dots
        dot_spacing = 2;
        dot_radius = 0.3;
        dot_height = 0.2;

        for (x = [-top_width/3 : dot_spacing : top_width/3]) {
            for (y = [-top_height/3 : dot_spacing : top_height/3]) {
                translate([x, y, total_depth - dish_depth/2])
                    sphere(r=dot_radius);
            }
        }
    } else if (texture_type == "lines") {
        // Parallel ridges
        line_spacing = 1.5;
        line_width = 0.3;
        line_height = 0.2;

        for (y = [-top_height/3 : line_spacing : top_height/3]) {
            translate([0, y, total_depth - dish_depth/2])
                cube([top_width*0.6, line_width, line_height], center=true);
        }
    } else if (texture_type == "grid") {
        // Crosshatch pattern
        grid_spacing = 2;
        line_width = 0.3;
        line_height = 0.15;

        for (x = [-top_width/3 : grid_spacing : top_width/3]) {
            translate([x, 0, total_depth - dish_depth/2])
                cube([line_width, top_height*0.6, line_height], center=true);
        }
        for (y = [-top_height/3 : grid_spacing : top_height/3]) {
            translate([0, y, total_depth - dish_depth/2])
                cube([top_width*0.6, line_width, line_height], center=true);
        }
    }
}

// Support brim for better FDM printing
module stem_brim() {
    brim_radius = 8;
    brim_height = 0.4;

    cylinder(h=brim_height, r=brim_radius, center=false);
}

/* ==================== MAIN KEYCAP ASSEMBLY ==================== */

module fidget_dsa_keycap() {
    union() {
        // Main keycap body
        dsa_keycap_shape();

        // Stem
        if (enable_stem) {
            translate([0, 0, stem_inset]) {
                if (stem_type == "cherry") {
                    cherry_stem();
                } else if (stem_type == "alps") {
                    alps_stem();
                } else if (stem_type == "choc") {
                    choc_stem();
                }
            }
        }
    }
}

// Generate the keycap!
fidget_dsa_keycap();

/* ==================== EXAMPLES ==================== */
// Uncomment any of these to see different configurations:

// Standard 1u DSA key:
// key_units = 1; fidget_dsa_keycap();

// Spacebar (6.25u):
// key_units = 6.25; fidget_dsa_keycap();

// 2u key with stabilizers would need additional stems at ±12mm

// Row of different sized keys:
/*
for (i = [0:4]) {
    translate([i * 20, 0, 0]) {
        key_units = 1 + i * 0.25;
        fidget_dsa_keycap();
    }
}
*/

// Fidget toy set without stems (flat bottom for gluing/pressing):
/*
enable_stem = false;
solid_base = true;
solid_base_thickness = 3;
add_texture = true;
texture_type = "dots";
fidget_dsa_keycap();
*/

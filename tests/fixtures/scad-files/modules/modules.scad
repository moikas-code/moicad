// Test module file for imports
module box(w, h, d) {
    cube([w, h, d]);
}

module cylinder_with_base(r, h) {
    union() {
        cylinder(r, h);
        translate([0, 0, -2]) cylinder(r, 2);
    }
}
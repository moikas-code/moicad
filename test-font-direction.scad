// Font and Direction Test File
// Tests the newly implemented font and direction features

// Font variants
translate([0, 0, 0]) text("Default Font", size=10);
translate([0, 15, 0]) text("Monospace", size=10, font="Courier");
translate([0, 30, 0]) text("Condensed", size=10, font="Arial Narrow");
translate([0, 45, 0]) text("Extended", size=10, font="Arial Extended");

// Direction tests
translate([100, 0, 0]) text("LTR", size=10, direction="ltr");
translate([100, 15, 0]) text("RTL", size=10, direction="rtl");
translate([100, 30, 0]) text("TTB", size=10, direction="ttb");
translate([100, 45, 0]) text("BTT", size=10, direction="btt");

// Combined tests
translate([200, 0, 0]) text("Mono RTL", size=10, font="Courier", direction="rtl");
translate([200, 20, 0]) text("Narrow TTB", size=10, font="Condensed", direction="ttb");

// With alignment
translate([300, 0, 0]) text("Centered", size=10, halign="center", font="Courier");
translate([300, 20, 0]) text("Vertical", size=10, direction="ttb", valign="center");

// 3D text with font and direction
translate([0, 70, 0]) linear_extrude(height=5)
  text("3D Mono", size=10, font="Courier", halign="center");

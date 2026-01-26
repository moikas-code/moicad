// Text Alignment Test File
// Tests the newly implemented text alignment features

// Test 1: Left alignment (default)
translate([0, 0, 0]) text("Left", size=10, halign="left");

// Test 2: Center alignment
translate([0, 15, 0]) text("Center", size=10, halign="center");

// Test 3: Right alignment
translate([0, 30, 0]) text("Right", size=10, halign="right");

// Test 4: Top vertical alignment
translate([50, 0, 0]) text("Top", size=10, valign="top");

// Test 5: Center vertical alignment
translate([50, 15, 0]) text("Center", size=10, valign="center");

// Test 6: Baseline vertical alignment (default)
translate([50, 30, 0]) text("Baseline", size=10, valign="baseline");

// Test 7: Bottom vertical alignment
translate([50, 45, 0]) text("Bottom", size=10, valign="bottom");

// Test 8: Spacing test
translate([100, 0, 0]) text("Spaced", size=10, spacing=1.5);

// Test 9: Combined alignment
translate([100, 20, 0]) text("Combined", size=10, halign="center", valign="center");

// Test 10: 3D text with alignment
translate([0, 60, 0]) linear_extrude(height=5) 
  text("3D Center", size=10, halign="center", valign="center");

# moicad Quick Start Guide

## 🚀 Getting Started

### Start the Backend
```bash
cd /home/moika/Documents/code/moicad
bun --hot ./backend/index.ts
```

Server runs at: `http://localhost:3000`

### Your First Shape
```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'
```

## 📝 Language Quick Reference

### Variables
```scad
size = 10;
width = size * 2;
height = width + 5;
```

### Functions
```scad
function double(x) = x * 2;
function area(w, h) = w * h;

my_size = double(5);  // 10
```

### Modules
```scad
module box(w, h, d) {
    cube([w, h, d]);
}

module hollow(outer, wall) {
    difference() {
        cube(outer);
        translate([wall, wall, wall])
            cube(outer - wall*2);
    }
}

hollow(20, 2);
```

### Conditionals
```scad
big = true;

if (big) {
    cube(20);
} else {
    cube(10);
}

// Ternary
size = big ? 20 : 10;
```

### For Loops
```scad
for (i = [0 : 4]) {
    translate([i * 15, 0, 0])
        cube(5 + i);
}
```

### Expressions
```scad
// Arithmetic
result = 10 * 2 + 5;  // 25

// Comparison
is_big = result > 20;  // true

// Logical
show = is_big && true;  // true

// Ternary
choice = is_big ? 100 : 50;  // 100
```

### Built-in Math
```scad
abs(-5)           // 5
sqrt(16)          // 4
pow(2, 3)         // 8
min(5, 10, 3)     // 3
max(5, 10, 3)     // 10
sin(30)           // 0.5 (degrees)
cos(60)           // 0.5
```

## 🎯 Common Patterns

### Parametric Part
```scad
// Parameters
outer_size = 20;
wall_thickness = 2;
inner_size = outer_size - wall_thickness * 2;

// Create hollow box
difference() {
    cube(outer_size);
    translate([wall_thickness, wall_thickness, wall_thickness])
        cube(inner_size);
}
```

### Reusable Component
```scad
module keycap(base, height, wall) {
    difference() {
        cube([base, base, height]);
        translate([wall, wall, wall])
            cube([base - wall*2, base - wall*2, height]);
    }
}

// Use it multiple times
keycap(18, 8, 1.5);

translate([20, 0, 0])
    keycap(15, 6, 1.2);
```

### Array of Objects
```scad
for (i = [0 : 5]) {
    translate([i * 20, 0, 0])
        cube(5 + i * 2);
}
```

## 📚 Examples

See the `examples/` directory:
- `feature-showcase.scad` - All language features
- `advanced-features.scad` - Complex examples

## 🔧 API Reference

### Parse Only
```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'
```

### Evaluate to Geometry
```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"sphere(10);"}'
```

### Export to STL
```bash
# First get geometry, then:
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{"geometry":{...},"format":"stl"}' \
  > model.stl
```

## 🆘 Troubleshooting

### Backend won't start
```bash
# Rebuild WASM
cd wasm
wasm-pack build --target web
cd ..

# Install dependencies
bun install
```

### Syntax errors
- All statements need semicolons: `size = 10;`
- Function bodies use `=`, not `{}`: `function f(x) = x * 2;`
- Module bodies use `{}`: `module m() { cube(10); }`

## 📖 Full Documentation

- [CLAUDE.md](./CLAUDE.md) - Complete implementation guide
- [OPENSCAD_COMPATIBILITY.md](./OPENSCAD_COMPATIBILITY.md) - Feature compatibility
- [OpenSCAD Reference](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/The_OpenSCAD_Language)

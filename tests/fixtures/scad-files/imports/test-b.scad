// File B includes File A (creates circular dependency)
include "test-a.scad";

module box_b(size) {
    cube(size);
}
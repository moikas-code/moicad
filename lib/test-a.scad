// File A includes File B
include "test-b.scad";

module box_a(size) {
    cube(size);
}
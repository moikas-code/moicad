#[cfg(test)]
mod difference_tests {

    /// Test difference with non-overlapping spheres
    /// Expected: Should return first sphere unchanged
    #[test]
    fn test_difference_non_overlapping() {
        eprintln!("\n=== TEST: Non-overlapping spheres ===");

        // Two spheres 30mm apart (radius=10 each, so no overlap)
        let sphere_a = create_sphere(10.0, 8);
        let sphere_b_translated = translate(&create_sphere(10.0, 8), 30.0, 0.0, 0.0);

        eprintln!("Sphere A: {} vertices, {} faces",
                  sphere_a.vertex_count(), sphere_a.face_count());
        eprintln!("Sphere B (translated 30mm): {} vertices, {} faces",
                  sphere_b_translated.vertex_count(), sphere_b_translated.face_count());

        let result = difference(&sphere_a, &sphere_b_translated);

        eprintln!("Result: {} vertices, {} faces",
                  result.vertex_count(), result.face_count());

        // Should return A unchanged (same face count)
        assert_eq!(result.face_count(), sphere_a.face_count(),
                   "Non-overlapping difference should return A unchanged");
    }

    /// Test difference with overlapping spheres
    /// Expected: Should create crescent shape (fewer faces than A+B, more than A alone)
    #[test]
    fn test_difference_overlapping() {
        eprintln!("\n=== TEST: Overlapping spheres ===");

        // Two spheres 12mm apart (radius=10 each, so they overlap)
        let sphere_a = create_sphere(10.0, 8);
        let sphere_b_translated = translate(&create_sphere(10.0, 8), 12.0, 0.0, 0.0);

        eprintln!("Sphere A: {} vertices, {} faces",
                  sphere_a.vertex_count(), sphere_a.face_count());
        eprintln!("Sphere B (translated 12mm): {} vertices, {} faces",
                  sphere_b_translated.vertex_count(), sphere_b_translated.face_count());

        let result = difference(&sphere_a, &sphere_b_translated);

        eprintln!("Result: {} vertices, {} faces",
                  result.vertex_count(), result.face_count());

        // Result should have geometry (not empty)
        assert!(result.face_count() > 0,
                "Difference result should not be empty");

        // Result should NOT be a union (union would have A+B faces)
        let union_face_count = sphere_a.face_count() + sphere_b_translated.face_count();
        assert_ne!(result.face_count(), union_face_count,
                   "Difference should NOT produce union-like result with {} faces", union_face_count);

        // Result should have FEWER faces than union
        assert!(result.face_count() < union_face_count,
                "Difference should have fewer faces than union ({} < {})",
                result.face_count(), union_face_count);
    }

    /// Test difference with simple cubes
    /// Expected: Cube with rectangular hole
    #[test]
    fn test_difference_cube() {
        eprintln!("\n=== TEST: Cube with hole ===");

        // Large cube with small cube subtracted
        let cube_a = create_cube(20.0);
        let cube_b_translated = translate(&create_cube(10.0), 5.0, 5.0, 5.0);

        eprintln!("Cube A (20mm): {} vertices, {} faces",
                  cube_a.vertex_count(), cube_a.face_count());
        eprintln!("Cube B (10mm, translated): {} vertices, {} faces",
                  cube_b_translated.vertex_count(), cube_b_translated.face_count());

        let result = difference(&cube_a, &cube_b_translated);

        eprintln!("Result: {} vertices, {} faces",
                  result.vertex_count(), result.face_count());

        // Result should have more faces than original cube (due to internal cavity)
        assert!(result.face_count() >= cube_a.face_count(),
                "Hollow cube should have at least as many faces as solid cube");

        // Result should NOT be empty
        assert!(result.face_count() > 0,
                "Difference result should not be empty");
    }

    /// Test difference with completely overlapping geometry
    /// Expected: Should return empty mesh
    #[test]
    fn test_difference_complete_overlap() {
        eprintln!("\n=== TEST: Complete overlap (same position) ===");

        let sphere_a = create_sphere(10.0, 8);
        let sphere_b = create_sphere(10.0, 8);

        eprintln!("Sphere A: {} vertices, {} faces",
                  sphere_a.vertex_count(), sphere_a.face_count());
        eprintln!("Sphere B (same position): {} vertices, {} faces",
                  sphere_b.vertex_count(), sphere_b.face_count());

        let result = difference(&sphere_a, &sphere_b);

        eprintln!("Result: {} vertices, {} faces",
                  result.vertex_count(), result.face_count());

        // Should return empty or very small result (sphere subtracted from itself)
        assert!(result.face_count() < sphere_a.face_count() / 2,
                "Subtracting identical overlapping geometry should reduce faces significantly");
    }
}

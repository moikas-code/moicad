/**
 * Text Rendering for OpenSCAD
 *
 * Implements 3D text generation using manifold primitives.
 * Creates extruded text from basic geometric shapes representing characters.
 */

import { getManifold, initManifold } from "./manifold-engine";
import type { ManifoldObject } from "./manifold-types";
import * as Ops2D from "./manifold-2d";

// Simple bitmap font data for ASCII characters
// Each character is represented as a list of rectangular regions [x, y, width, height]
// in a 5x7 grid (normalized to 0-1 range)

const CHAR_WIDTH = 5;
const CHAR_HEIGHT = 7;

// Character definitions using rectangles in a 5x7 grid
const CHAR_DATA: Record<string, [number, number, number, number][]> = {
  A: [
    [0, 0, 1, 4],
    [4, 0, 1, 4],
    [0, 3, 5, 1],
    [1, 4, 1, 2],
    [3, 4, 1, 2],
    [1, 6, 3, 1],
  ],
  B: [
    [0, 0, 1, 7],
    [1, 0, 3, 1],
    [1, 3, 3, 1],
    [1, 6, 3, 1],
    [4, 1, 1, 2],
    [4, 4, 1, 2],
  ],
  C: [
    [0, 1, 1, 5],
    [1, 0, 3, 1],
    [1, 6, 3, 1],
    [4, 1, 1, 1],
    [4, 5, 1, 1],
  ],
  D: [
    [0, 0, 1, 7],
    [1, 0, 3, 1],
    [1, 6, 3, 1],
    [4, 1, 1, 5],
  ],
  E: [
    [0, 0, 1, 7],
    [1, 0, 4, 1],
    [1, 3, 3, 1],
    [1, 6, 4, 1],
  ],
  F: [
    [0, 0, 1, 7],
    [1, 3, 3, 1],
    [1, 6, 4, 1],
  ],
  G: [
    [0, 1, 1, 5],
    [1, 0, 3, 1],
    [1, 6, 3, 1],
    [4, 1, 1, 1],
    [4, 5, 1, 1],
    [2, 3, 3, 1],
    [4, 1, 1, 3],
  ],
  H: [
    [0, 0, 1, 7],
    [4, 0, 1, 7],
    [1, 3, 3, 1],
  ],
  I: [
    [1, 0, 3, 1],
    [1, 6, 3, 1],
    [2, 1, 1, 5],
  ],
  J: [
    [3, 0, 1, 6],
    [4, 0, 1, 1],
    [0, 1, 1, 2],
    [1, 0, 2, 1],
  ],
  K: [
    [0, 0, 1, 7],
    [4, 0, 1, 3],
    [4, 4, 1, 3],
    [1, 3, 3, 1],
  ],
  L: [
    [0, 0, 1, 7],
    [1, 0, 4, 1],
  ],
  M: [
    [0, 0, 1, 7],
    [4, 0, 1, 7],
    [1, 5, 1, 2],
    [2, 4, 1, 1],
    [3, 5, 1, 2],
  ],
  N: [
    [0, 0, 1, 7],
    [4, 0, 1, 7],
    [1, 5, 1, 1],
    [2, 4, 1, 1],
    [3, 2, 1, 2],
  ],
  O: [
    [0, 1, 1, 5],
    [4, 1, 1, 5],
    [1, 0, 3, 1],
    [1, 6, 3, 1],
  ],
  P: [
    [0, 0, 1, 7],
    [1, 3, 3, 1],
    [1, 6, 3, 1],
    [4, 4, 1, 2],
  ],
  Q: [
    [0, 1, 1, 5],
    [4, 1, 1, 4],
    [1, 0, 3, 1],
    [1, 6, 3, 1],
    [3, 1, 1, 1],
    [4, 0, 1, 1],
  ],
  R: [
    [0, 0, 1, 7],
    [1, 3, 3, 1],
    [1, 6, 3, 1],
    [4, 4, 1, 2],
    [3, 2, 1, 1],
    [4, 0, 1, 2],
  ],
  S: [
    [0, 1, 1, 2],
    [4, 4, 1, 2],
    [1, 0, 3, 1],
    [1, 3, 3, 1],
    [1, 6, 3, 1],
    [4, 5, 1, 1],
    [0, 1, 1, 1],
  ],
  T: [
    [0, 6, 5, 1],
    [2, 0, 1, 6],
  ],
  U: [
    [0, 1, 1, 6],
    [4, 1, 1, 6],
    [1, 0, 3, 1],
  ],
  V: [
    [0, 3, 1, 4],
    [4, 3, 1, 4],
    [1, 1, 1, 2],
    [3, 1, 1, 2],
    [2, 0, 1, 1],
  ],
  W: [
    [0, 0, 1, 7],
    [4, 0, 1, 7],
    [2, 0, 1, 5],
    [1, 2, 1, 1],
    [3, 2, 1, 1],
  ],
  X: [
    [0, 0, 1, 3],
    [4, 0, 1, 3],
    [0, 4, 1, 3],
    [4, 4, 1, 3],
    [2, 3, 1, 1],
  ],
  Y: [
    [0, 4, 1, 3],
    [4, 4, 1, 3],
    [2, 0, 1, 4],
    [1, 3, 1, 1],
    [3, 3, 1, 1],
  ],
  Z: [
    [0, 0, 5, 1],
    [0, 6, 5, 1],
    [1, 1, 1, 1],
    [2, 2, 1, 1],
    [3, 4, 1, 1],
    [4, 5, 1, 1],
  ],
  "0": [
    [0, 1, 1, 5],
    [4, 1, 1, 5],
    [1, 0, 3, 1],
    [1, 6, 3, 1],
    [2, 3, 1, 1],
  ],
  "1": [
    [2, 0, 1, 7],
    [1, 6, 1, 1],
    [3, 0, 1, 1],
    [1, 0, 3, 1],
  ],
  "2": [
    [0, 0, 5, 1],
    [4, 1, 1, 2],
    [1, 3, 3, 1],
    [0, 4, 1, 2],
    [0, 6, 5, 1],
  ],
  "3": [
    [0, 0, 4, 1],
    [0, 3, 4, 1],
    [0, 6, 4, 1],
    [4, 1, 1, 2],
    [4, 4, 1, 2],
  ],
  "4": [
    [0, 3, 1, 4],
    [4, 0, 1, 7],
    [0, 3, 5, 1],
  ],
  "5": [
    [0, 6, 5, 1],
    [0, 3, 5, 1],
    [0, 3, 1, 3],
    [4, 1, 1, 2],
    [0, 0, 4, 1],
  ],
  "6": [
    [0, 1, 1, 5],
    [1, 0, 3, 1],
    [1, 6, 3, 1],
    [4, 1, 1, 2],
    [1, 3, 3, 1],
  ],
  "7": [
    [0, 6, 5, 1],
    [4, 0, 1, 6],
    [2, 3, 2, 1],
  ],
  "8": [
    [0, 1, 1, 2],
    [0, 4, 1, 2],
    [4, 1, 1, 2],
    [4, 4, 1, 2],
    [1, 0, 3, 1],
    [1, 3, 3, 1],
    [1, 6, 3, 1],
  ],
  "9": [
    [0, 4, 1, 2],
    [4, 1, 1, 5],
    [1, 0, 3, 1],
    [1, 6, 3, 1],
    [1, 3, 3, 1],
  ],
  " ": [], // Space - no rectangles
  ".": [[2, 0, 1, 1]],
  ",": [
    [2, 0, 1, 2],
    [1, -1, 1, 1],
  ],
  "!": [
    [2, 2, 1, 5],
    [2, 0, 1, 1],
  ],
  "?": [
    [1, 6, 3, 1],
    [4, 4, 1, 2],
    [2, 2, 1, 2],
    [2, 0, 1, 1],
  ],
  "-": [[1, 3, 3, 1]],
  "+": [
    [2, 1, 1, 5],
    [0, 3, 5, 1],
  ],
  "=": [
    [0, 2, 5, 1],
    [0, 4, 5, 1],
  ],
  ":": [
    [2, 1, 1, 2],
    [2, 5, 1, 2],
  ],
  ";": [
    [2, 5, 1, 2],
    [2, 1, 1, 2],
    [1, 0, 1, 1],
  ],
  "/": [
    [0, 0, 1, 2],
    [1, 1, 1, 2],
    [2, 3, 1, 1],
    [3, 4, 1, 2],
    [4, 5, 1, 2],
  ],
  "\\": [
    [0, 5, 1, 2],
    [1, 4, 1, 2],
    [2, 3, 1, 1],
    [3, 1, 1, 2],
    [4, 0, 1, 2],
  ],
  _: [[0, 0, 5, 1]],
  "(": [
    [2, 0, 1, 1],
    [1, 1, 1, 5],
    [2, 6, 1, 1],
  ],
  ")": [
    [2, 0, 1, 1],
    [3, 1, 1, 5],
    [2, 6, 1, 1],
  ],
  "[": [
    [1, 0, 1, 7],
    [2, 0, 2, 1],
    [2, 6, 2, 1],
  ],
  "]": [
    [3, 0, 1, 7],
    [1, 0, 2, 1],
    [1, 6, 2, 1],
  ],
  "{": [
    [3, 0, 1, 1],
    [2, 1, 1, 2],
    [1, 3, 1, 1],
    [2, 4, 1, 2],
    [3, 6, 1, 1],
  ],
  "}": [
    [1, 0, 1, 1],
    [2, 1, 1, 2],
    [3, 3, 1, 1],
    [2, 4, 1, 2],
    [1, 6, 1, 1],
  ],
  "<": [
    [3, 0, 1, 2],
    [2, 2, 1, 1],
    [1, 3, 1, 1],
    [2, 4, 1, 1],
    [3, 5, 1, 2],
  ],
  ">": [
    [1, 0, 1, 2],
    [2, 2, 1, 1],
    [3, 3, 1, 1],
    [2, 4, 1, 1],
    [1, 5, 1, 2],
  ],
  "*": [
    [2, 2, 1, 3],
    [1, 3, 1, 1],
    [3, 3, 1, 1],
    [0, 4, 1, 1],
    [4, 4, 1, 1],
    [0, 2, 1, 1],
    [4, 2, 1, 1],
  ],
  "#": [
    [1, 0, 1, 7],
    [3, 0, 1, 7],
    [0, 2, 5, 1],
    [0, 5, 5, 1],
  ],
  "@": [
    [1, 1, 3, 1],
    [0, 2, 1, 3],
    [4, 2, 1, 3],
    [1, 5, 3, 1],
    [2, 2, 2, 1],
    [3, 3, 1, 1],
    [2, 4, 2, 1],
  ],
  "&": [
    [1, 1, 2, 1],
    [0, 2, 1, 2],
    [2, 3, 2, 1],
    [0, 4, 1, 2],
    [4, 4, 1, 2],
    [1, 6, 2, 1],
    [3, 0, 1, 2],
  ],
  "%": [
    [0, 5, 1, 2],
    [1, 4, 1, 1],
    [2, 3, 1, 1],
    [3, 2, 1, 1],
    [4, 0, 1, 2],
  ],
  $: [
    [1, 0, 3, 1],
    [0, 1, 1, 2],
    [1, 3, 3, 1],
    [4, 4, 1, 2],
    [1, 6, 3, 1],
    [2, 0, 1, 7],
  ],
  "^": [
    [2, 5, 1, 2],
    [1, 4, 1, 1],
    [3, 4, 1, 1],
  ],
  "~": [
    [0, 4, 1, 1],
    [1, 5, 1, 1],
    [2, 4, 1, 1],
    [3, 5, 1, 1],
    [4, 4, 1, 1],
  ],
  "`": [
    [1, 6, 1, 1],
    [2, 5, 1, 1],
  ],
  "'": [[2, 5, 1, 2]],
  '"': [
    [1, 5, 1, 2],
    [3, 5, 1, 2],
  ],
  "|": [[2, 0, 1, 7]],
};

// Add lowercase letters as copies of uppercase (for simplicity)
for (const char of "abcdefghijklmnopqrstuvwxyz") {
  CHAR_DATA[char] = CHAR_DATA[char.toUpperCase()] || [];
}

/**
 * Create 3D text geometry
 *
 * @param text - The text string to render
 * @param options - Text options
 * @returns ManifoldObject containing extruded text
 */
export async function createText(
  text: string,
  options: {
    size?: number;
    font?: string;
    halign?: "left" | "center" | "right";
    valign?: "baseline" | "center" | "top" | "bottom";
    spacing?: number;
    direction?: "ltr" | "rtl" | "ttb" | "btt";
    language?: string;
    script?: string;
    $fn?: number;
  } = {},
): Promise<ManifoldObject> {
  await initManifold();
  const Manifold = getManifold();

  const {
    size = 10,
    halign = "left",
    valign = "baseline",
    spacing = 1,
    direction = "ltr",
  } = options;

  // Character dimensions
  const charWidth = size * 0.8;
  const charHeight = size;
  const charSpacing = charWidth * spacing * 0.2;
  const charDepth = size * 0.1; // Thickness of the text

  // Process text string
  const chars = direction === "rtl" ? text.split("").reverse() : text.split("");

  const charManifolds: ManifoldObject[] = [];
  let xOffset = 0;

  for (const char of chars) {
    const charData = CHAR_DATA[char];

    if (charData && charData.length > 0) {
      // Create rectangles for this character
      const rectManifolds: ManifoldObject[] = [];

      for (const [rx, ry, rw, rh] of charData) {
        // Scale from 5x7 grid to actual size
        const scaleX = charWidth / CHAR_WIDTH;
        const scaleY = charHeight / CHAR_HEIGHT;

        const x = rx * scaleX + xOffset;
        const y = ry * scaleY;
        const width = rw * scaleX;
        const height = rh * scaleY;

        // Create a box for this rectangle
        const rect = Manifold.cube([width, height, charDepth], false);
        const translated = rect.translate([x, y, 0]);
        rectManifolds.push(translated);
      }

      // Union all rectangles for this character
      if (rectManifolds.length > 0) {
        const charUnion = rectManifolds.reduce((acc, curr) => acc.add(curr));
        charManifolds.push(charUnion);
      }
    }

    // Move to next character position
    xOffset += charWidth + charSpacing;
  }

  if (charManifolds.length === 0) {
    // Return a tiny cube if no characters were rendered
    return Manifold.cube([0.01, 0.01, 0.01], true);
  }

  // Combine all characters
  let result = charManifolds.reduce((acc, curr) => acc.add(curr));

  // Apply horizontal alignment
  const totalWidth = xOffset - charSpacing; // Remove last spacing
  if (halign === "center") {
    result = result.translate([-totalWidth / 2, 0, 0]);
  } else if (halign === "right") {
    result = result.translate([-totalWidth, 0, 0]);
  }

  // Apply vertical alignment
  const totalHeight = charHeight;
  if (valign === "center") {
    result = result.translate([0, -totalHeight / 2, 0]);
  } else if (valign === "top") {
    result = result.translate([0, -totalHeight, 0]);
  }
  // baseline and bottom are at y=0

  return result;
}

/**
 * Create 2D text outline (for linear_extrude)
 */
export async function createText2D(
  text: string,
  options: {
    size?: number;
    halign?: "left" | "center" | "right";
    valign?: "baseline" | "center" | "top" | "bottom";
    spacing?: number;
  } = {},
): Promise<any> {
  await initManifold();
  const { getManifoldWasm } = await import("./manifold-engine");
  const wasm = getManifoldWasm();

  const {
    size = 10,
    halign = "left",
    valign = "baseline",
    spacing = 1,
  } = options;

  // Character dimensions
  const charWidth = size * 0.8;
  const charHeight = size;
  const charSpacing = charWidth * spacing * 0.2;

  const chars = text.split("");
  const crossSections: any[] = [];
  let xOffset = 0;

  for (const char of chars) {
    const charData = CHAR_DATA[char];

    if (charData && charData.length > 0) {
      for (const [rx, ry, rw, rh] of charData) {
        const scaleX = charWidth / CHAR_WIDTH;
        const scaleY = charHeight / CHAR_HEIGHT;

        const x = rx * scaleX + xOffset;
        const y = ry * scaleY;
        const width = rw * scaleX;
        const height = rh * scaleY;

        // Create a 2D rectangle
        const rect = wasm.CrossSection.square([width, height], false);
        const translated = rect.translate([x, y]);
        crossSections.push(translated);
      }
    }

    xOffset += charWidth + charSpacing;
  }

  if (crossSections.length === 0) {
    return wasm.CrossSection.square([0.01, 0.01], true);
  }

  // Union all cross sections
  let result = crossSections.reduce((acc, curr) => acc.add(curr));

  // Apply alignment
  const totalWidth = xOffset - charSpacing;
  if (halign === "center") {
    result = result.translate([-totalWidth / 2, 0]);
  } else if (halign === "right") {
    result = result.translate([-totalWidth, 0]);
  }

  const totalHeight = charHeight;
  if (valign === "center") {
    result = result.translate([0, -totalHeight / 2]);
  } else if (valign === "top") {
    result = result.translate([0, -totalHeight]);
  }

  return result;
}

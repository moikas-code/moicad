import type { Plugin, PrimitiveFunction, TransformFunction, SCADFunction } from '../src/plugins/types';
import { Shape } from '../src/shape';

/**
 * Example plugin demonstrating all extension types
 */
export const examplePlugin: Plugin = {
  name: 'example-plugin',
  version: '1.0.0',
  description: 'Example plugin demonstrating plugin system capabilities',
  author: 'moicad-team',

  // Custom primitives
  primitives: {
    // Create a torus (donut shape)
    torus: (outerRadius: number, innerRadius: number, segments: number = 32) => {
      const points: number[][] = [];
      const step = (2 * Math.PI) / segments;
      
      // Generate torus cross-section points
      for (let i = 0; i <= segments; i++) {
        const angle = i * step;
        const x = (innerRadius + outerRadius * Math.cos(angle));
        const y = outerRadius * Math.sin(angle);
        points.push([x, y]);
      }
      
      // Create circle for cross-section and revolve
      const crossSection = Shape.circle(outerRadius / 2);
      const centerHole = Shape.circle(innerRadius / 2);
      const torusProfile = crossSection.subtract(centerHole);
      
      return torusProfile.rotateExtrude({ angle: 360, $fn: segments })
        .translate([0, 0, 0]);
    },

    // Create a spring/helix
    spring: (height: number, radius: number, turns: number = 5, wireRadius: number = 1) => {
      const points: number[][] = [];
      const segments = turns * 32;
      
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * turns * 2 * Math.PI;
        const z = (i / segments) * height;
        const x = radius * Math.cos(t);
        const y = radius * Math.sin(t);
        points.push([x, y, z]);
      }
      
      // Create a simple spring by extruding a circle along the path
      const baseCircle = Shape.circle(wireRadius);
      return baseCircle.linearExtrude(height, { 
        twist: turns * 360, 
        scale: 1 
      }).translate([radius, 0, 0]);
    },

    // Create a gear
    gear: (radius: number, teeth: number, height: number = 5, pressureAngle: number = 20) => {
      const toothAngle = (2 * Math.PI) / teeth;
      const baseRadius = radius * 0.8;
      const tipRadius = radius;
      
      const points: number[][] = [];
      
      for (let i = 0; i < teeth; i++) {
        const baseAngle = i * toothAngle;
        
        // Base of tooth
        points.push([
          baseRadius * Math.cos(baseAngle - toothAngle * 0.4),
          baseRadius * Math.sin(baseAngle - toothAngle * 0.4)
        ]);
        
        // Tip of tooth
        points.push([
          tipRadius * Math.cos(baseAngle),
          tipRadius * Math.sin(baseAngle)
        ]);
        
        // Base of next tooth
        points.push([
          baseRadius * Math.cos(baseAngle + toothAngle * 0.4),
          baseRadius * Math.sin(baseAngle + toothAngle * 0.4)
        ]);
      }
      
      const gearProfile = Shape.polygon(points);
      const centerHole = Shape.circle(baseRadius * 0.3);
      
      return gearProfile.subtract(centerHole).linearExtrude(height);
    }
  },

  // Custom transforms
  transforms: {
    // Create a rounded edge
    fillet: (shape: Shape, radius: number, edges?: string[]) => {
      // Simple fillet implementation by rounding corners
      // This is a simplified version - real filleting is much more complex
      return shape.offset(-radius).offset(radius);
    },

    // Create a chamfered edge
    chamfer: (shape: Shape, distance: number) => {
      // Simple chamfer implementation
      return shape.offset(-distance, { chamfer: true }).offset(distance, { chamfer: true });
    },

    // Create an array of objects
    array: (shape: Shape, countX: number, countY: number = 1, countZ: number = 1, spacing: number = 10) => {
      let result = shape;
      
      for (let x = 1; x < countX; x++) {
        result = result.union(shape.translate([x * spacing, 0, 0]));
      }
      
      let rowResult = result;
      for (let y = 1; y < countY; y++) {
        rowResult = rowResult.union(result.translate([0, y * spacing, 0]));
      }
      
      let layerResult = rowResult;
      for (let z = 1; z < countZ; z++) {
        layerResult = layerResult.union(rowResult.translate([0, 0, z * spacing]));
      }
      
      return layerResult;
    }
  },

  // OpenSCAD functions
  scadFunctions: {
    // Custom SCAD function for calculating gear parameters
    calc_gear_params: (module: number, teeth: number) => {
      const pitchDiameter = module * teeth;
      const addendum = module;
      const dedendum = 1.25 * module;
      const outsideDiameter = pitchDiameter + 2 * addendum;
      
      return {
        pitch_diameter: pitchDiameter,
        addendum: addendum,
        dedendum: dedendum,
        outside_diameter: outsideDiameter
      };
    },

    // Math helper function for golden ratio
    golden_ratio: () => (1 + Math.sqrt(5)) / 2,

    // Function to create fibonacci sequence
    fibonacci: (n: number) => {
      const fib = [0, 1];
      for (let i = 2; i < n; i++) {
        fib.push(fib[i - 1] + fib[i - 2]);
      }
      return fib;
    }
  },

  // Lifecycle hooks
  async initialize(manager) {
    console.log('Example plugin initialized!');
    
    // Register custom hooks
    manager.addHook('shape.create', (type: string, ...args: any[]) => {
      console.log(`Creating shape: ${type}`, args);
    });
    
    manager.addHook('transform.apply', (type: string, shape: Shape, ...args: any[]) => {
      console.log(`Applying transform: ${type}`, args);
    });
  },

  async activate() {
    console.log('Example plugin activated!');
  },

  async deactivate() {
    console.log('Example plugin deactivated!');
  }
};

export default examplePlugin;
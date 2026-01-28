import type { Shape } from '../shape';

export interface PluginManager {
  register(plugin: Plugin): void;
  unregister(name: string): void;
  getPlugin(name: string): Plugin | undefined;
  getAllPlugins(): Plugin[];
  executeHook<T>(hookName: string, ...args: any[]): T | undefined;
  addHook(hookName: string, callback: Function): void;
  removeHook(hookName: string, callback: Function): void;
  loadPlugin(plugin: Plugin): Promise<void>;
  loadPluginFromPath(path: string): Promise<void>;
  loadPluginFromNpm(packageName: string): Promise<void>;
  isPluginEnabled(name: string): boolean;
  setPluginEnabled(name: string, enabled: boolean): void;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  
  // Lifecycle hooks
  initialize?(manager: PluginManager): void | Promise<void>;
  activate?(): void | Promise<void>;
  deactivate?(): void | Promise<void>;
  
  // Extension points
  primitives?: Record<string, PrimitiveFunction>;
  transforms?: Record<string, TransformFunction>;
  fileHandlers?: FileHandler[];
  scadFunctions?: Record<string, SCADFunction>;
  viewportExtensions?: ViewportExtension[];
}

export interface PrimitiveFunction {
  (...args: any[]): Shape;
}

export interface TransformFunction {
  (shape: Shape, ...args: any[]): Shape;
}

export interface FileHandler {
  name: string;
  extensions: string[];
  import?: (data: string | ArrayBuffer) => Shape | Promise<Shape>;
  export?: (shape: Shape) => string | ArrayBuffer | Promise<string | ArrayBuffer>;
}

export interface SCADFunction {
  (...args: any[]): any;
}

export interface ViewportExtension {
  name: string;
  type: 'renderer' | 'control' | 'effect' | 'ui';
  initialize?(viewport: any): void;
  render?(context: any): void;
  cleanup?(): void;
}

export interface PluginConfig {
  enabled: boolean;
  priority: number;
  settings?: Record<string, any>;
}

export interface PluginHook {
  name: string;
  priority: number;
  callback: Function;
}

export type HookName = 
  | 'shape.create'
  | 'shape.create.after'
  | 'transform.apply'
  | 'transform.apply.after'
  | 'geometry.compute'
  | 'geometry.compute.after'
  | 'file.import'
  | 'file.import.after'
  | 'file.export'
  | 'file.export.after'
  | 'scad.parse'
  | 'scad.parse.after'
  | 'scad.evaluate'
  | 'scad.evaluate.after'
  | 'viewport.render'
  | 'viewport.render.after'
  | 'plugin.register'
  | 'plugin.unregister';
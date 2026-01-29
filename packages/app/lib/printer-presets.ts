/**
 * 3D Printer Build Volume Presets
 * Common 3D printer dimensions for quick selection
 */

export interface PrinterPreset {
  name: string;
  manufacturer: string;
  width: number;  // X axis in mm
  depth: number;  // Y axis in mm
  height: number; // Z axis in mm
}

export const PRINTER_PRESETS: PrinterPreset[] = [
  // BambuLab
  {
    name: 'P2S',
    manufacturer: 'BambuLab',
    width: 256,
    depth: 256,
    height: 300
  },
  {
    name: 'X1 Carbon',
    manufacturer: 'BambuLab',
    width: 256,
    depth: 256,
    height: 256
  },
  {
    name: 'A1',
    manufacturer: 'BambuLab',
    width: 256,
    depth: 256,
    height: 256
  },
  {
    name: 'A1 Mini',
    manufacturer: 'BambuLab',
    width: 180,
    depth: 180,
    height: 180
  },
  
  // Prusa
  {
    name: 'MK4',
    manufacturer: 'Prusa',
    width: 250,
    depth: 210,
    height: 220
  },
  {
    name: 'MK3S+',
    manufacturer: 'Prusa',
    width: 250,
    depth: 210,
    height: 210
  },
  {
    name: 'Mini+',
    manufacturer: 'Prusa',
    width: 180,
    depth: 180,
    height: 180
  },
  {
    name: 'XL (5-tool)',
    manufacturer: 'Prusa',
    width: 360,
    depth: 360,
    height: 360
  },
  
  // Creality
  {
    name: 'Ender 3',
    manufacturer: 'Creality',
    width: 220,
    depth: 220,
    height: 250
  },
  {
    name: 'Ender 3 V2',
    manufacturer: 'Creality',
    width: 220,
    depth: 220,
    height: 250
  },
  {
    name: 'CR-10',
    manufacturer: 'Creality',
    width: 300,
    depth: 300,
    height: 400
  },
  {
    name: 'K1',
    manufacturer: 'Creality',
    width: 220,
    depth: 220,
    height: 250
  },
  
  // Anycubic
  {
    name: 'Kobra 2',
    manufacturer: 'Anycubic',
    width: 250,
    depth: 220,
    height: 220
  },
  
  // Ultimaker
  {
    name: 'S5',
    manufacturer: 'Ultimaker',
    width: 330,
    depth: 240,
    height: 300
  },
  {
    name: 'S3',
    manufacturer: 'Ultimaker',
    width: 230,
    depth: 190,
    height: 200
  },
  
  // Custom
  {
    name: 'Custom',
    manufacturer: 'Custom',
    width: 200,
    depth: 200,
    height: 200
  }
];

/**
 * Get default printer (BambuLab P2S)
 */
export function getDefaultPrinter(): PrinterPreset {
  return PRINTER_PRESETS[0]; // BambuLab P2S
}

/**
 * Find printer by name
 */
export function findPrinter(manufacturer: string, name: string): PrinterPreset | undefined {
  return PRINTER_PRESETS.find(
    p => p.manufacturer === manufacturer && p.name === name
  );
}

/**
 * Get all printers by manufacturer
 */
export function getPrintersByManufacturer(manufacturer: string): PrinterPreset[] {
  return PRINTER_PRESETS.filter(p => p.manufacturer === manufacturer);
}

/**
 * Get all unique manufacturers
 */
export function getManufacturers(): string[] {
  return Array.from(new Set(PRINTER_PRESETS.map(p => p.manufacturer)));
}

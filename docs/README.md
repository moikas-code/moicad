# moicad Documentation Index

This folder contains comprehensive documentation for moicad development and future enhancement planning.

## Folder Structure

### [future-enhancements/](./future-enhancements/)
Detailed implementation plans for known enhancement opportunities:
- **[text.md](./future-enhancements/text.md)** - Text primitive enhancements
- **[minkowski.md](./future-enhancements/minkowski.md)** - Minkowski CSG operation integration
- **[color-material.md](./future-enhancements/color-material.md)** - Color and material support
- **[include-use.md](./future-enhancements/include-use.md)** - File import operations
- **[extrusion.md](./future-enhancements/extrusion.md)** - Extrusion operations implementation and future enhancements

### [architecture/](./architecture/) (planned)
System architecture documentation:
- **parser.md** - Parser design and OpenSCAD language support
- **evaluator.md** - Evaluation engine and CSG operations  
- **wasm-engine.md** - WASM CSG engine and geometry processing

### [api/](./api/) (planned)
API reference documentation:
- **rest-endpoints.md** - REST API specification
- **websocket-protocol.md** - Real-time communication protocol

## How to Use This Documentation

### For Developers
1. **Current Status**: Check main README.md and STATUS.md for current implementation
2. **Enhancement Planning**: Review future-enhancements/ for upcoming work
3. **Architecture**: See architecture/ for system design details
4. **API Reference**: Use api/ for integration details

### For Contributors
1. **Pick Enhancement**: Choose from future-enhancements/ based on priority
2. **Check Dependencies**: Review implementation notes for required work
3. **Implementation**: Follow development timeline and complexity estimates
4. **Documentation**: Update relevant files after implementation

### For Users
1. **Features**: Check README.md for currently supported OpenSCAD features
2. **Limitations**: Review feature documentation for current capabilities
3. **Future**: See future-enhancements/ for planned improvements

## Documentation Maintenance

### Adding New Enhancement Plans
1. Create new .md file in future-enhancements/
2. Follow existing template structure:
   - Current Status
   - Implementation Tasks with time estimates
   - Expected Behavior
   - Priority assessment
3. Update this index.md to reference new file

### Updating Existing Plans
1. Track progress in relevant enhancement file
2. Update time estimates and complexity based on findings
3. Mark completed sections appropriately
4. Move to main documentation when complete

## Development Priority Matrix

All enhancement plans include priority assessments:
- **HIGH**: Critical functionality gaps (1-2 days)
- **MEDIUM**: Important improvements (2-3 days)  
- **LOW**: Nice-to-have features (3+ days)

Use this matrix to plan development sprints and resource allocation.
# moicad Debug System Architecture

A comprehensive, professional debugging and logging system for the moicad OpenSCAD clone project.

## 📁 Directory Structure

```
scripts/
├── debug/                    # Debug utilities organized by function
│   ├── tokenizer.js           # OpenSCAD lexical analysis
│   ├── range-parser.js        # Range syntax debugging
│   ├── step-evaluator.js     # Incremental parser analysis
│   ├── simple-parser.js      # Quick syntax validation
│   ├── string-parser.js       # Character-level analysis
│   └── list-comprehension.js  # List comprehension testing
├── dev/                     # Development tools and utilities
│   ├── rotate-logs.js         # Log rotation automation
│   └── cleanup-logs.js        # Log cleanup and management
└── tools/                   # Additional development tools

logs/
├── current/                  # Active log files
│   ├── error.log             # Error-specific logs (5MB max, 30 days)
│   ├── combined.log          # General application logs (10MB max, 14 days)
│   ├── debug.log            # Debug-specific logs (2MB max, 7 days)
│   └── server.log            # Server startup and runtime logs
└── archive/                  # Compressed historical logs
    └── *.log-YYYY-MM-DD.gz  # Rotated logs with timestamps

.dev-tools/
└── launch.json               # VSCode debug configurations

docs/debugging/
├── README.md                 # This file
├── debug-tools.md            # Individual tool documentation
├── log-analysis.md           # Log file analysis guide
└── troubleshooting.md        # Common debugging scenarios
```

## 🛠️ Debug Utilities

### Core Debug Scripts

All debug scripts follow a standardized format with:

- **Comprehensive documentation** with purpose and usage
- **Structured output** with emojis and clear formatting
- **Performance timing** for parsing analysis
- **Error handling** with detailed reporting
- **Modular design** for integration with other tools

#### Available Debug Scripts

| Script | Purpose | Key Features |
|---------|---------|---------------|
| `tokenizer.js` | Lexical analysis | Token breakdown, type analysis, character analysis |
| `range-parser.js` | Range syntax testing | Progressive testing, AST analysis, success rate tracking |
| `step-evaluator.js` | Incremental parsing | Step-by-step assembly, error identification |
| `simple-parser.js` | Quick validation | Fast syntax checks, performance timing |
| `string-parser.js` | Character analysis | ASCII breakdown, encoding detection |
| `list-comprehension.js` | List comprehension testing | Comprehensive test cases, performance analysis |

### Usage Examples

```bash
# Run individual debug tools
node scripts/debug/tokenizer.js
node scripts/debug/range-parser.js

# Run all debug scripts
bun run debug:all

# Run specific category
bun run debug:tokenizer
bun run debug:list

# Debug with specific focus
LOG_LEVEL=debug node scripts/debug/range-parser.js
```

## 📊 Logging System

### Enhanced Winston Configuration

The moicad project uses a production-ready Winston logging setup with:

#### Log Categories & Rotation

| Log Type | Purpose | Size Limit | Retention | Rotation |
|-----------|---------|------------|-----------|----------|
| Error Logs | Critical errors | 5MB | 30 days | Immediate |
| Combined Logs | General application | 10MB | 14 days | Daily |
| Debug Logs | Development debugging | 2MB | 7 days | Daily |
| Archive | Historical data | Variable | 90+ days | Automatic |

#### Log Format

All logs use structured JSON format:
```json
{
  "timestamp": "2026-01-26 14:30:45",
  "level": "info",
  "message": "Processing job abc123",
  "label": "MOICAD",
  "service": "moicad-backend",
  "version": "2.0.0",
  "pid": 12345,
  "duration": 45.2,
  "unit": "ms"
}
```

#### Environment-Specific Behavior

- **Development**: Console output + file logging + debug logs
- **Production**: File logging only + structured rotation
- **Test**: Silent logging with test-specific output

### Log Management Scripts

#### Log Rotation (`scripts/dev/rotate-logs.js`)

**Features:**
- Size-based rotation (configurable thresholds)
- Time-based archiving (24+ hour threshold)
- gzip compression for space savings
- Comprehensive reporting
- Dry-run mode for safe testing

**Usage:**
```bash
# Normal rotation
node scripts/dev/rotate-logs.js

# Force rotation of all logs
node scripts/dev/rotate-logs.js --force

# Show help
node scripts/dev/rotate-logs.js --help
```

#### Log Cleanup (`scripts/dev/cleanup-logs.js`)

**Features:**
- Archive cleanup (configurable retention)
- Large file detection (>100MB)
- Interactive confirmation mode
- Space usage statistics
- Dry-run capability

**Usage:**
```bash
# Normal cleanup with 90-day retention
node scripts/dev/cleanup-logs.js

# Dry run only (no deletion)
node scripts/dev/cleanup-logs.js --dry-run

# Custom retention period
node scripts/dev/cleanup-logs.js --retention 30

# Interactive mode with confirmation
node scripts/dev/cleanup-logs.js --interactive
```

## 🎯 VSCode Debug Configuration

Professional debugging setup with organized launch configurations:

### Debug Categories

#### Debug Utilities
- Individual script debuggers with proper environment
- Hot-reload support
- Integrated console output

#### Backend Debugging
- Full server debugging with TypeScript support
- Module-specific debugging (parser, evaluator)
- WASM debugging with Rust integration

#### Compound Debugging
- Multi-process debugging for complex scenarios
- Coordinated launch configurations
- Sequential debugging workflows

### Launch Configurations

The `.dev-tools/launch.json` provides:

1. **Individual Debug Scripts**: Each utility has its own configuration
2. **Backend Modules**: Debug parser, evaluator, server separately
3. **Development Tools**: Debug log rotation and cleanup scripts
4. **Compound Configurations**: Run multiple debug sessions together

### Usage in VSCode

1. Press `F5` or go to Run and Debug panel
2. Select from organized categories:
   - Debug Utilities (for language issues)
   - Backend (for server problems)
   - Compound (for complex scenarios)
3. Set breakpoints, inspect variables, step through code

## 📈 Performance Monitoring

### Built-in Performance Tracking

The enhanced logger includes performance monitoring:

```javascript
import { PerformanceLogger } from './backend/enhanced-logger.js';

const perf = new PerformanceLogger(logger, 'Parser Operation');
// ... code to measure ...
perf.end({ codeLength: 1024, complexity: 'high' });
```

### Metrics Captured

- **Execution time** with millisecond precision
- **Memory usage** (where available)
- **Operation metadata** for correlation
- **Success/failure rates** for reliability tracking

## 🔧 Integration with Test Suite

### Debug-Test Synergy

Debug utilities are designed to work seamlessly with the existing test suite:

- **Shared utilities** in `tests/utils/test-helpers.ts`
- **Mock data** generation for reproducible tests
- **Performance comparison** between debug and test runs
- **API compatibility** for integration testing

### Running Debug Tests

```bash
# Run debug scripts as part of test suite
bun run test:unit     # Runs unit tests
bun run debug:all       # Runs all debug utilities
bun run logs:stats      # Shows current log statistics
```

## 📋 Best Practices

### Development Workflow

1. **Start with Simple Scripts**: Use `simple-parser.js` for quick syntax validation
2. **Progressive Debugging**: Use `step-evaluator.js` for incremental analysis
3. **Specialized Analysis**: Use specific debuggers for targeted issues
4. **Performance Monitoring**: Always time operations to identify bottlenecks
5. **Log Management**: Regular cleanup and rotation to prevent disk issues

### Log Maintenance

1. **Daily Rotation**: Set up cron job for automatic log rotation
2. **Weekly Cleanup**: Remove archives older than retention period
3. **Monitor Disk Space**: Use log stats to track growth
4. **Backup Strategy**: Important logs should be backed up before cleanup

### Debug Script Development

When creating new debug utilities:

1. **Follow Template**: Use existing scripts as templates
2. **Add Documentation**: Include purpose, usage, and examples
3. **Use Structured Output**: Consistent formatting with emojis
4. **Handle Errors Gracefully**: Try-catch with detailed reporting
5. **Export Functions**: Allow import by other debug tools

### Configuration Management

1. **Environment Variables**: Use `LOG_LEVEL` and `NODE_ENV` for behavior
2. **Centralized Config**: Keep settings in `backend/enhanced-logger.js`
3. **Default Values**: Provide sensible defaults for all settings
4. **Documentation**: Update this file when adding new configurations

## 🚀 Advanced Features

### Intelligent Error Analysis

The debug system provides:
- **Error pattern recognition** for common issues
- **Position tracking** for precise error location
- **Context preservation** for error investigation
- **Reproduction guidance** for bug reports

### Automated Diagnostics

Debug scripts can automatically:
- **Identify syntax errors** with detailed explanations
- **Suggest fixes** based on common patterns
- **Performance benchmarking** against known good cases
- **Generate reports** for issue tracking

### Integration with IDE

- **VSCode tasks** for quick access to debug tools
- **Debug configurations** for one-click debugging
- **Problems panel integration** for error highlighting
- **Terminal integration** for seamless workflow

## 📞 Getting Help

### Common Debugging Scenarios

1. **Parser Issues**: Start with `tokenizer.js`, then `step-evaluator.js`
2. **Range Problems**: Use `range-parser.js` for syntax testing
3. **List Comprehension Issues**: Use `list-comprehension.js` for comprehensive testing
4. **Performance Issues**: Use performance monitoring in all debug scripts
5. **Log Analysis**: Use `logs:stats` to understand system behavior

### Troubleshooting Debug Tools

If debug scripts don't work:

1. **Check Environment**: Ensure `NODE_ENV=development`
2. **Verify Dependencies**: Check backend modules are importable
3. **Check File Paths**: Ensure relative paths are correct
4. **Review Logs**: Check for import or permission errors

## 📚 References

### Related Documentation

- **`tests/README.md`** - Test suite documentation
- **`CLAUDE.md`** - Implementation details
- **`README.md`** - Project overview and usage
- **Enhanced Logger Source** - `backend/enhanced-logger.js`

### External Resources

- **Winston Logging**: https://github.com/winstonjs/winston
- **Node.js Debugging**: https://nodejs.org/en/docs/guides/debugging-getting-started/
- **VSCode Debugging**: https://code.visualstudio.com/docs/editor/debugging

---

## 🎯 System Status

The moicad debug system is **production-ready** with:

- ✅ **Professional organization** following industry standards
- ✅ **Comprehensive tooling** for all debugging scenarios
- ✅ **Automated management** for logs and archives
- ✅ **IDE integration** with VSCode configurations
- ✅ **Performance monitoring** and optimization guidance
- ✅ **Documentation** and best practices

**Last Updated**: 2026-01-26  
**Version**: 2.0.0  
**Compatibility**: Node.js 18+, Bun 1.3+, VSCode 1.80+
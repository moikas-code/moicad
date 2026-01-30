/**
 * CSG Web Worker for @moicad/sdk
 *
 * Runs manifold-3d CSG operations in a separate thread to prevent UI freezing.
 * Handles both JavaScript and OpenSCAD evaluation.
 */
// Worker state
let manifoldWasm = null;
let Manifold = null;
let isInitialized = false;
let currentOperation = null;
/**
 * Initialize manifold WASM in worker context
 */
async function initManifold() {
    if (isInitialized)
        return;
    try {
        // Dynamic import of manifold-3d
        const Module = await import('manifold-3d');
        manifoldWasm = await Module.default();
        manifoldWasm.setup();
        Manifold = manifoldWasm.Manifold;
        isInitialized = true;
        self.postMessage({
            id: 'init',
            type: 'SUCCESS',
            payload: { message: 'Worker initialized' }
        });
    }
    catch (error) {
        self.postMessage({
            id: 'init',
            type: 'ERROR',
            payload: {
                message: `Failed to initialize manifold: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
        });
        throw error;
    }
}
/**
 * Send progress update to main thread
 */
function sendProgress(id, stage, progress, message, details) {
    self.postMessage({
        id,
        type: 'PROGRESS',
        payload: {
            stage,
            progress: progress / 100, // Convert to 0-1 range
            message,
            details
        }
    });
}
/**
 * Check if operation should be cancelled
 */
function checkCancelled() {
    return currentOperation?.abort === true;
}
/**
 * Evaluate JavaScript code with progress tracking
 */
async function evaluateJavaScript(code, timeout, progressDetail, t) {
    // Import runtime components dynamically
    const { evaluateJavaScript: runtimeEvaluate } = await import('../runtime/index');
    sendProgress('eval', 'initializing', 0, 'Initializing JavaScript runtime...');
    sendProgress('eval', 'evaluating', 10, 'Evaluating JavaScript code...');
    const result = await runtimeEvaluate(code, {
        timeout,
        t
    });
    if (checkCancelled())
        throw new Error('Operation cancelled');
    if (!result.geometry) {
        throw new Error(result.errors?.[0]?.message || 'Evaluation failed');
    }
    sendProgress('eval', 'complete', 100, 'Complete');
    return result.geometry;
}
/**
 * Evaluate OpenSCAD code with progress tracking
 */
async function evaluateOpenSCAD(code, timeout, progressDetail) {
    sendProgress('eval', 'initializing', 0, 'Initializing OpenSCAD parser...');
    // Import SCAD components dynamically - use the correct export names
    const { SCAD } = await import('../scad/index');
    sendProgress('eval', 'parsing', 20, 'Parsing OpenSCAD code...');
    const parseResult = SCAD.parse(code);
    if (checkCancelled())
        throw new Error('Operation cancelled');
    if (!parseResult.success || parseResult.errors.length > 0 || !parseResult.ast) {
        throw new Error(parseResult.errors[0]?.message || 'Parse failed');
    }
    sendProgress('eval', 'evaluating', 40, 'Evaluating AST...');
    const evalResult = await SCAD.evaluate(parseResult.ast);
    if (checkCancelled())
        throw new Error('Operation cancelled');
    if (!evalResult.geometry) {
        throw new Error(evalResult.errors?.[0]?.message || 'Evaluation failed');
    }
    sendProgress('eval', 'complete', 100, 'Complete');
    return evalResult.geometry;
}
/**
 * Handle evaluation request
 */
async function handleEvaluate(message) {
    const { id, payload } = message;
    if (!payload) {
        self.postMessage({
            id,
            type: 'ERROR',
            payload: { message: 'No payload provided' }
        });
        return;
    }
    // Set up cancellation token
    currentOperation = { abort: false };
    try {
        // Ensure manifold is initialized
        if (!isInitialized) {
            await initManifold();
        }
        if (checkCancelled()) {
            throw new Error('Operation cancelled');
        }
        let geometry;
        const startTime = performance.now();
        if (payload.language === 'javascript') {
            geometry = await evaluateJavaScript(payload.code, payload.timeout, payload.progressDetail, payload.t);
        }
        else {
            geometry = await evaluateOpenSCAD(payload.code, payload.timeout, payload.progressDetail);
        }
        const executionTime = performance.now() - startTime;
        // Send success result
        self.postMessage({
            id,
            type: 'SUCCESS',
            payload: {
                geometry,
                errors: [],
                success: true,
                executionTime
            }
        });
    }
    catch (error) {
        // Send error result
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isCancelled = errorMessage.includes('cancelled');
        const evalError = {
            message: errorMessage,
            category: isCancelled ? 'system' : 'system',
            severity: 'error'
        };
        self.postMessage({
            id,
            type: 'ERROR',
            payload: {
                geometry: null,
                errors: [evalError],
                success: false,
                executionTime: 0
            }
        });
    }
    finally {
        currentOperation = null;
    }
}
/**
 * Handle cancellation request
 */
function handleCancel() {
    if (currentOperation) {
        currentOperation.abort = true;
    }
}
/**
 * Main message handler
 */
self.onmessage = async (event) => {
    const message = event.data;
    switch (message.type) {
        case 'EVALUATE':
            await handleEvaluate(message);
            break;
        case 'CANCEL':
            handleCancel();
            self.postMessage({
                id: message.id,
                type: 'SUCCESS',
                payload: { message: 'Cancellation requested' }
            });
            break;
        case 'PING':
            self.postMessage({
                id: message.id,
                type: 'PONG',
                payload: {
                    message: 'Worker alive',
                    initialized: isInitialized
                }
            });
            break;
        default:
            self.postMessage({
                id: message.id,
                type: 'ERROR',
                payload: { message: `Unknown message type: ${message.type}` }
            });
    }
};
// Initialize on load
initManifold().catch(console.error);
export {};
//# sourceMappingURL=csg-worker.js.map
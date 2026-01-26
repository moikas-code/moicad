import { parseOpenSCAD } from './scad-parser';
import { evaluateAST, setWasmModule } from './scad-evaluator';
import type { EvaluateMessage, EvaluateResponse } from '../shared/types';

// Declare global self as any to avoid type issues with WorkerGlobalScope
declare const self: any;

let wasmModule: any = null;
let isInitialized = false;

// Initialize WASM
async function initWasm() {
    if (isInitialized) return;

    try {
        // Import and initialize WASM module
        // Note: We use the same path as index.ts relative to the build output
        const imported = await import('../wasm/pkg/moicad_wasm.js');

        // The default export is the init function, call it to initialize
        if (imported.default) {
            await imported.default();
        }

        wasmModule = imported;
        setWasmModule(imported);
        isInitialized = true;
        console.log('Worker: WASM module initialized');
    } catch (err) {
        console.error('Worker: Failed to load WASM module', err);
        throw err;
    }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent) => {
    const data = event.data;

    // Initialize on first message if needed
    if (!isInitialized) {
        try {
            await initWasm();
        } catch (err: any) {
            self.postMessage({
                type: 'error',
                requestId: data.requestId,
                error: `Worker initialization failed: ${err.message}`
            });
            return;
        }
    }

    try {
        if (data.type === 'evaluate') {
            await handleEvaluate(data);
        } else {
            console.warn('Worker: Unknown message type', data.type);
        }
    } catch (err: any) {
        self.postMessage({
            type: 'error',
            requestId: data.requestId,
            error: `Worker error: ${err.message}`
        });
    }
};

async function handleEvaluate(data: EvaluateMessage) {
    const startTime = performance.now();

    try {
        if (!wasmModule) {
            throw new Error('WASM module not loaded');
        }

        // Parse
        const parseResult = parseOpenSCAD(data.code);
        if (!parseResult.success || !parseResult.ast) {
            self.postMessage({
                type: 'evaluate_response',
                requestId: data.requestId,
                geometry: null,
                errors: parseResult.errors,
                executionTime: performance.now() - startTime,
            } as EvaluateResponse);
            return;
        }

        // Evaluate
        // IMPORTANT: specific disableParallel: true to prevent recursive worker spawning
        const evalResult = await evaluateAST(parseResult.ast, {
            previewMode: true,
            disableParallel: true
        });

        self.postMessage({
            type: 'evaluate_response',
            requestId: data.requestId,
            geometry: evalResult.geometry,
            errors: evalResult.errors,
            success: evalResult.success,
            executionTime: evalResult.executionTime,
        } as EvaluateResponse);

        // Monitor memory usage
        const memUsage = process.memoryUsage();
        console.log(`Worker memory: RSS=${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

    } catch (err: any) {
        self.postMessage({
            type: 'evaluate_response',
            requestId: data.requestId,
            geometry: null,
            errors: [{ message: err.message, stack: err.stack }],
            executionTime: performance.now() - startTime,
        } as EvaluateResponse);
    }
}

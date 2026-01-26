# Evaluator Architecture

The evaluator is responsible for taking the Abstract Syntax Tree (AST) produced by the parser and turning it into 3D geometry.

## Parallel Evaluation

To improve performance on complex scenes, the evaluator uses a parallel evaluation strategy. This is handled by the `ParallelEvaluator` class.

### Implementation

The `ParallelEvaluator` uses a pool of Web Workers to evaluate independent nodes of the AST in parallel.

1.  **Worker Pool:** A pool of workers is created to avoid the overhead of spawning new workers for each task. The number of workers is configurable.
2.  **Task Distribution:** When a complex scene is evaluated, the `ParallelEvaluator`'s `batchEvaluateNodes` method is called. This method distributes the evaluation of independent nodes to the worker pool.
3.  **Partial Evaluation:** Each worker performs a partial evaluation of the node. The worker can evaluate JavaScript-based expressions and constructs, but it cannot perform the final geometry creation, which relies on a WASM module that is only available on the main thread.
4.  **Placeholder Results:** The worker returns a "placeholder" result to the main thread. This placeholder contains the evaluated parameters and information about the operation to be performed.
5.  **Final Evaluation:** The main thread receives the placeholder results and performs the final evaluation, calling the WASM module to create the geometry.

This approach offloads the JavaScript-heavy parts of the evaluation to worker threads, freeing up the main thread to remain responsive and to handle the final, WASM-based geometry creation.

### Usage

Parallel evaluation is automatically used for scenes with a sufficient number of executable nodes. The threshold is configurable in the `evaluateAST` function.

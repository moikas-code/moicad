export interface RenderProgress {
  stage: string;
  progress: number;
  message: string;
  details?: {
    memoryUsageMB?: number;
    currentChunk?: number;
    totalChunks?: number;
    nodesProcessed?: number;
    totalNodes?: number;
    estimatedTimeRemainingMs?: number;
  };
}
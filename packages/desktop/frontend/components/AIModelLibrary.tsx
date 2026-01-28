/**
 * AI Model Library Component
 *
 * Displays stored AI-generated models with thumbnails, metadata, and actions.
 * Allows users to browse, insert, and delete models from their library.
 */

'use client';

import { useAIModelLibrary, formatFileSize, formatRelativeTime } from '@/hooks/useAIModelLibrary';

interface AIModelLibraryProps {
  onInsertCode: (code: string) => void;
  onClose: () => void;
}

export function AIModelLibrary({ onInsertCode, onClose }: AIModelLibraryProps) {
  const { models, loading, error, stats, deleteModel } = useAIModelLibrary();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading models...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No AI models yet. Generate your first model!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Models you generate will be stored in your browser and appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Storage Stats */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600 dark:text-gray-400">Total Models</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.totalModels || 0}
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Storage Used</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatFileSize(stats?.totalSize || 0)}
          </p>
        </div>
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {models.map((model) => (
          <div
            key={model.id}
            className="group border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer"
            onClick={() => {
              onInsertCode(`ai_import("${model.id}");`);
              onClose();
            }}
          >
            {/* Thumbnail */}
            {model.thumbnail ? (
              <img
                src={model.thumbnail}
                alt={model.prompt || 'AI model'}
                className="w-full h-32 object-cover rounded mb-2 bg-gray-100 dark:bg-gray-800"
              />
            ) : (
              <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
                <span className="text-4xl">🤖</span>
              </div>
            )}

            {/* Model Info */}
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={model.prompt || model.id}>
              {model.prompt || model.imageUrl || model.id}
            </p>

            {/* Metadata */}
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatRelativeTime(model.createdAt)}</span>
              <span>{(model.polycount / 1000).toFixed(1)}K verts</span>
            </div>

            {/* Source Badge */}
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                {model.source === 'text-to-3d' ? '📝 Text' : model.source === 'image-to-3d' ? '🖼️ Image' : '✨ Refined'}
              </span>
            </div>

            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this model? This cannot be undone.')) {
                  deleteModel(model.id!);
                }
              }}
              className="mt-2 w-full px-2 py-1 text-xs text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
            >
              🗑️ Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

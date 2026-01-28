/**
 * AI Generation Dialog Component
 *
 * Modal dialog for generating 3D models using AI (text-to-3D, image-to-3D).
 * Provides progress tracking and integrates with the editor to insert ai_import() code.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAIGeneration } from '@/hooks/useAIGeneration';
import { hasAPIKey, saveAPIKey, clearAPIKey } from '@/lib/api-key-storage';
import { AIModelLibrary } from '@/components/AIModelLibrary';

interface AIGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  onInsertCode: (code: string) => void;
}

export function AIGenerationDialog({ open, onClose, onInsertCode }: AIGenerationDialogProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'library' | 'settings'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mode, setMode] = useState<'preview' | 'full'>('full');
  const [hasKey, setHasKey] = useState(false);

  // API key settings state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const { loading, progress, stage, error, generateFromText, generateFromImage, reset } = useAIGeneration();

  // Check for API key on mount
  useEffect(() => {
    hasAPIKey('fal.ai').then(setHasKey);
  }, [open]);

  const handleGenerateText = async () => {
    if (!prompt.trim()) return;

    try {
      const result = await generateFromText({ prompt, mode });

      // Insert ai_import code at cursor
      onInsertCode(`ai_import("${result.modelId}");`);

      // Close dialog
      setTimeout(() => {
        onClose();
        reset();
      }, 1000);
    } catch (err) {
      // Error already handled by hook
      console.error('Generation failed:', err);
    }
  };

  const handleGenerateImage = async () => {
    if (!imageUrl.trim()) return;

    try {
      const result = await generateFromImage({ imageUrl });

      // Insert ai_import code
      onInsertCode(`ai_import("${result.modelId}");`);

      // Close dialog
      setTimeout(() => {
        onClose();
        reset();
      }, 1000);
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  const handleSaveAPIKey = async () => {
    try {
      await saveAPIKey('fal.ai', apiKey);
      setApiKey(''); // Clear input
      setKeySaved(true);
      setHasKey(true);
      setTimeout(() => setKeySaved(false), 3000); // Hide message after 3s
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  };

  const handleClearAPIKey = async () => {
    clearAPIKey('fal.ai');
    setApiKey('');
    setKeySaved(false);
    setHasKey(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI 3D Generation</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasKey ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>API Key Required:</strong> Please configure your fal.ai API key in Settings.
              </p>
              <button
                onClick={() => setActiveTab('settings')}
                className="mt-2 text-sm text-yellow-900 dark:text-yellow-100 underline"
              >
                Go to Settings
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`pb-2 px-1 font-medium ${
                    activeTab === 'text'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Text-to-3D
                </button>
                <button
                  onClick={() => setActiveTab('image')}
                  className={`pb-2 px-1 font-medium ${
                    activeTab === 'image'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Image-to-3D
                </button>
                <button
                  onClick={() => setActiveTab('library')}
                  className={`pb-2 px-1 font-medium ${
                    activeTab === 'library'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Model Library
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`pb-2 px-1 font-medium ${
                    activeTab === 'settings'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Settings
                </button>
              </div>

              {/* Text-to-3D Tab */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prompt (max 600 characters)
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe your 3D model... (e.g., 'modern office chair with wheels')"
                      maxLength={600}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={loading}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {prompt.length}/600 characters
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMode('preview')}
                        disabled={loading}
                        className={`px-4 py-2 rounded-md font-medium ${
                          mode === 'preview'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Preview (Fast, 5-10 min)
                      </button>
                      <button
                        onClick={() => setMode('full')}
                        disabled={loading}
                        className={`px-4 py-2 rounded-md font-medium ${
                          mode === 'full'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Full (Textured, 10-15 min)
                      </button>
                    </div>
                  </div>

                  {loading && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stage}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        This may take 5-15 minutes. Please be patient...
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleGenerateText}
                    disabled={loading || !prompt.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Generate Model'}
                  </button>
                </div>
              )}

              {/* Image-to-3D Tab */}
              {activeTab === 'image' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={loading}
                    />
                  </div>

                  {loading && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stage}</p>
                    </div>
                  )}

                  {error && (
                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleGenerateImage}
                    disabled={loading || !imageUrl.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Generate Model'}
                  </button>
                </div>
              )}

              {/* Library Tab */}
              {activeTab === 'library' && (
                <AIModelLibrary onInsertCode={onInsertCode} onClose={onClose} />
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      fal.ai API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="fal_..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                        title={showKey ? 'Hide key' : 'Show key'}
                      >
                        {showKey ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  {keySaved && (
                    <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded">
                      ✓ API key saved successfully
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAPIKey}
                      disabled={!apiKey.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save API Key
                    </button>
                    <button
                      onClick={handleClearAPIKey}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Clear Key
                    </button>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2">Get your API key from fal.ai:</p>
                    <a
                      href="https://fal.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      https://fal.ai →
                    </a>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Your API key is encrypted and stored locally in your browser. It never leaves your device.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

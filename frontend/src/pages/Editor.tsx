import React from 'react';
import MonacoEditor from '@monaco-editor/react';

export default function Editor() {
  return (
    <div className="h-screen w-full flex flex-col bg-base text-text">
      <div className="p-4 border-b border-border bg-panel flex justify-between items-center">
        <h1 className="text-xl font-bold">Flux Editor</h1>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
      <div className="flex-1 w-full">
        <MonacoEditor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Write your code here"
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      </div>
    </div>
  );
}

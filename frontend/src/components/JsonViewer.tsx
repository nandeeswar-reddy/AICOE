import React from 'react';

interface JsonViewerProps {
    data: any;
    title: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, title }) => {
    return (
        <div className="glass-panel h-full flex flex-col">
            <div className="p-4 border-b border-border bg-surface/80">
                <h3 className="font-semibold text-primary">{title}</h3>
            </div>
            <div className="p-4 overflow-auto flex-grow bg-black/40 text-xs font-mono text-gray-300">
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    );
};

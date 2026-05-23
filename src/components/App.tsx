// src/components/App.tsx
import React, { useRef, useEffect, useState } from 'react';
import { CanvasController } from '../core/controllers/CanvasController';
import { ToolManager } from '../core/tools/ToolManager';
import { ShapeTool } from '../core/tools/ShapeTool';
import { useAppStore } from '../core/adapters/store';
import { hexToRgba } from '../core/utils/helpers';

export const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controllerRef = useRef<CanvasController | null>(null);
    const toolManagerRef = useRef<ToolManager | null>(null);
    const [shapes, setShapes] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const { activeTool, shapeType, primaryColor, brushSize, setActiveTool, setShapeType } = useAppStore();

    // Color/opacity states for UI
    const [fillColor, setFillColor] = useState('#6496dc');
    const [fillOpacity, setFillOpacity] = useState(0.6);
    const [strokeColor, setStrokeColor] = useState('#2c3e66');
    const [strokeOpacity, setStrokeOpacity] = useState(1);

    useEffect(() => {
        if (!canvasRef.current) return;
        const width = window.innerWidth - 40;
        const height = window.innerHeight - 280;
        canvasRef.current.width = width;
        canvasRef.current.height = height;

        // Create tool manager and register tools
        const toolManager = new ToolManager();
        const shapeTool = new ShapeTool();
        toolManager.register(shapeTool);
        // Activate shape tool by default (context will be set inside CanvasController)
        // toolManager.activate('shape', {} as any);
        console.log('Registered tools:', Array.from(toolManager['tools'].keys())); // should include 'shape'


        // Create controller (passes toolManager and creates its own context)
        const controller = new CanvasController(canvasRef.current, width, height, toolManager);
        // Expose shapeManager callbacks to React
        const shapeManager = (controller as any).shapeManager;
        shapeManager.onShapesChange = setShapes;
        shapeManager.onSelectedChange = setSelectedIds;
        controllerRef.current = controller;
        toolManagerRef.current = toolManager;

        // Cleanup
        return () => {
            controller.destroy();
        };
    }, []);

    // Monitor drawing mode state from controller (polling or via event bus – simplified here)
    useEffect(() => {
        const interval = setInterval(() => {
            if (controllerRef.current) {
                const tempShape = (controllerRef.current as any).tempShape;
                setIsDrawingMode(tempShape !== null);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // When selection changes, sync UI color pickers with first selected shape
    useEffect(() => {
        if (selectedIds.length > 0) {
            const firstShape = shapes.find(s => s.id === selectedIds[0]);
            if (firstShape) {
                // Parse fill color
                const fillMatch = firstShape.fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
                if (fillMatch) {
                    const r = parseInt(fillMatch[1]);
                    const g = parseInt(fillMatch[2]);
                    const b = parseInt(fillMatch[3]);
                    const a = fillMatch[4] ? parseFloat(fillMatch[4]) : 1;
                    setFillColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
                    setFillOpacity(a);
                } else if (firstShape.fill.startsWith('#')) {
                    setFillColor(firstShape.fill);
                    setFillOpacity(1);
                }
                // Parse stroke color
                const strokeMatch = firstShape.stroke.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
                if (strokeMatch) {
                    const r = parseInt(strokeMatch[1]);
                    const g = parseInt(strokeMatch[2]);
                    const b = parseInt(strokeMatch[3]);
                    const a = strokeMatch[4] ? parseFloat(strokeMatch[4]) : 1;
                    setStrokeColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
                    setStrokeOpacity(a);
                } else if (firstShape.stroke.startsWith('#')) {
                    setStrokeColor(firstShape.stroke);
                    setStrokeOpacity(1);
                }
            }
        }
    }, [selectedIds, shapes]);

    // Handlers
    const handleDraw = () => {
        if (activeTool === 'shape') {
            controllerRef.current?.startDrawing();
        }
    };
    const handleCancelDraw = () => {
        controllerRef.current?.cancelDrawing();
    };
    const handleDelete = () => {
        controllerRef.current?.deleteSelected();
    };

    const handleShapeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as 'rect' | 'ellipse';
        console.log('Shape type changed to:', newType);
        setShapeType(newType);
        controllerRef.current?.setDrawingShapeType(newType);
    };

    const handleFillColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value;
        setFillColor(newColor);
        const rgba = hexToRgba(newColor, fillOpacity);
        controllerRef.current?.setSelectedFillColor(rgba);
    };
    const handleFillOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOpacity = parseFloat(e.target.value);
        setFillOpacity(newOpacity);
        const rgba = hexToRgba(fillColor, newOpacity);
        controllerRef.current?.setSelectedFillColor(rgba);
    };
    const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value;
        setStrokeColor(newColor);
        const rgba = hexToRgba(newColor, strokeOpacity);
        controllerRef.current?.setSelectedStrokeColor(rgba);
    };
    const handleStrokeOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOpacity = parseFloat(e.target.value);
        setStrokeOpacity(newOpacity);
        const rgba = hexToRgba(strokeColor, newOpacity);
        controllerRef.current?.setSelectedStrokeColor(rgba);
    };

    return (
        <div className="min-h-screen bg-[#f3f1eb] font-sans flex flex-col items-center">
            {/* Toolbar */}
            <div className="mt-4 mb-2 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-2 flex flex-wrap items-center justify-center gap-3">
                {/* Shape type selector */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1">
                    <span className="text-xs font-medium text-stone-600">Shape</span>
                    <select
                        value={shapeType}
                        onChange={(e) => handleShapeTypeChange(e)}
                        className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm cursor-pointer focus:outline-none"
                    >
                        <option value="rect">Rectangle</option>
                        <option value="ellipse">Ellipse</option>
                    </select>
                </div>

                {/* Draw / Cancel buttons */}
                <button
                    onClick={handleDraw}
                    disabled={isDrawingMode}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${isDrawingMode ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1e6f9f] text-white hover:bg-[#1a5a82]'
                        }`}
                >
                    Draw
                </button>
                {isDrawingMode && (
                    <button
                        onClick={handleCancelDraw}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                )}

                {/* Delete */}
                <button
                    onClick={handleDelete}
                    disabled={selectedIds.length === 0}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium ${selectedIds.length > 0 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                </button>

                <div className="w-px h-6 bg-gray-200" />

                {/* Fill control */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">Fill</span>
                    <input
                        type="color"
                        value={fillColor}
                        onChange={handleFillColorChange}
                        disabled={selectedIds.length === 0}
                        className="w-7 h-7 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
                    />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={fillOpacity}
                        onChange={handleFillOpacityChange}
                        disabled={selectedIds.length === 0}
                        className="w-20 h-1.5 cursor-pointer disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-500 w-9">{Math.round(fillOpacity * 100)}%</span>
                </div>

                {/* Stroke control */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">Stroke</span>
                    <input
                        type="color"
                        value={strokeColor}
                        onChange={handleStrokeColorChange}
                        disabled={selectedIds.length === 0}
                        className="w-7 h-7 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
                    />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={strokeOpacity}
                        onChange={handleStrokeOpacityChange}
                        disabled={selectedIds.length === 0}
                        className="w-20 h-1.5 cursor-pointer disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-500 w-9">{Math.round(strokeOpacity * 100)}%</span>
                </div>

                {selectedIds.length > 1 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {selectedIds.length} shapes selected
                    </span>
                )}
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="rounded-xl shadow-md"
                style={{ display: 'block' }}
            />

            {/* Shape list panel */}
            <div className="mt-5 bg-white rounded-2xl px-5 py-3 w-[90%] max-w-3xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Shapes ({shapes.length})</h3>
                <div className="flex flex-wrap gap-2">
                    {shapes.map(shape => (
                        <div
                            key={shape.id}
                            onClick={() => handleShapeTypeChange(shape.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition ${selectedIds.includes(shape.id) ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                }`}
                        >
                            <div
                                className="w-4 h-4 rounded-sm"
                                style={{ background: shape.fill, border: `1px solid ${shape.stroke}`, borderRadius: shape.type === 'ellipse' ? '50%' : '2px' }}
                            />
                            <span className="font-mono text-xs text-gray-600">{shape.type === 'rect' ? '□' : '○'} {shape.w}×{shape.h}</span>
                        </div>
                    ))}
                    {shapes.length === 0 && <span className="text-xs text-gray-400">No shapes – click Draw to create one</span>}
                </div>
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center max-w-xl">
                • <strong>Click</strong> a shape → select it.<br />
                • <strong>Ctrl/Cmd + Click</strong> → add/remove from selection.<br />
                • <strong>Drag empty area</strong> → marquee selection (add with Ctrl/Cmd).<br />
                • When 2+ shapes are selected: a <strong>blue group box with corner knobs</strong> appears.<br />
                &nbsp;&nbsp;&nbsp;– Drag inside the box → move all selected shapes.<br />
                &nbsp;&nbsp;&nbsp;– Drag edges/corners → resize the whole group.<br />
                • Color/opacity controls affect all selected shapes.
            </p>
        </div>
    );
};

export default App;
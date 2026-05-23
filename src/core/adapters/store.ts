import { create } from 'zustand';

interface AppState {
  activeTool: string;
  primaryColor: string;
  brushSize: number;
  shapeType: 'rect' | 'ellipse';
  setActiveTool: (tool: string) => void;
  setPrimaryColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setShapeType: (type: 'rect' | 'ellipse') => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTool: 'shape',
  primaryColor: '#1e6f9f',
  brushSize: 4,
  shapeType: 'rect',
  setActiveTool: (tool) => set({ activeTool: tool }),
  setPrimaryColor: (color) => set({ primaryColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),
  setShapeType: (type) => set({ shapeType: type }),
}));

// Vanilla store for OOP tools
export const appStore = useAppStore;
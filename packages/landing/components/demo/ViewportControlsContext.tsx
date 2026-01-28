import { createContext, useContext, ReactNode, useState } from "react";
import { SceneManager } from "@/lib/three-utils";

interface ViewportControlsContextType {
  setSceneManager: (manager: SceneManager | null) => void;
}

const ViewportControlsContext = createContext<ViewportControlsContextType | undefined>(
  undefined
);

interface ViewportControlsProviderProps {
  children: ReactNode;
}

export function ViewportControlsProvider({ children }: ViewportControlsProviderProps) {
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);

  const contextValue: ViewportControlsContextType = {
    setSceneManager,
  };

  return (
    <ViewportControlsContext.Provider value={contextValue}>
      {children}
    </ViewportControlsContext.Provider>
  );
}

export function useViewportControls(): ViewportControlsContextType {
  const context = useContext(ViewportControlsContext);
  if (context === undefined) {
    throw new Error("useViewportControls must be used within a ViewportControlsProvider");
  }
  return context;
}
import React from "react";
import type { ScannedDoc } from "../AgoraBridge.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface WorkspaceHomeProps {
  graph: React.ReactNode;
  composer?: React.ReactNode;
  rooms: RoomEntry[];
  docs: ScannedDoc[];
  workspacePath?: string;
  onSelectRoom: (roomId: string) => void;
  onOpenDocument: (doc: ScannedDoc) => void;
  onNewRoom?: () => void;
}

export const WorkspaceHome: React.FC<WorkspaceHomeProps> = ({
  graph,
  composer,
}) => {
  return (
    <section className="screen home-screen" style={{ display: "block", position: "relative", width: "100%", height: "100%" }}>
      <div className="graph-field">
        <div className="graph-controls">
          <h3>Graph display</h3>
          <div className="layer-row"><span>Documents / backlinks</span><span className="switch on"></span></div>
          <div className="layer-row"><span>Rooms</span><span className="switch"></span></div>
          <div className="layer-row"><span>Role red / green links</span><span className="switch on"></span></div>
          <div className="layer-row"><span>Claims / memory</span><span className="switch"></span></div>
          <div className="layer-row"><span>Density</span><span className="pill">Clean ▾</span></div>
        </div>
        <div style={{ position: "absolute", inset: 0 }}>
          {graph}
        </div>
      </div>
      <div className="home-composer">
        <h1>What should we build?</h1>
        {composer}
      </div>
    </section>
  );
};


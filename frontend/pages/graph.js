// frontend/pages/graph.js
import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";

export default function GraphView() {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API_BASE}/graph`)
      .then((res) => res.json())
      .then((data) => {
        const cy = cytoscape({
          container: containerRef.current,
          elements: [...data.nodes, ...data.edges],
          style: [
            {
              selector: 'node[type="page"]',
              style: {
                shape: "rectangle",
                label: "data(label)",
                width: 80,
                height: 40,
                backgroundColor: "#4f46e5",
                color: "#fff",
                fontSize: 10,
                textWrap: "wrap",
                textMaxWidth: 70,
              },
            },
            {
              selector: 'node[type="tag"]',
              style: {
                shape: "ellipse",
                label: "data(label)",
                backgroundColor: "#10b981",
                color: "#fff",
                fontSize: 10,
                textWrap: "wrap",
                textMaxWidth: 70,
              },
            },
            {
              selector: "edge",
              style: {
                width: 2,
                lineColor: "#aaa",
                targetArrowShape: "triangle",
                targetArrowColor: "#aaa",
                curveStyle: "bezier",
              },
            },
          ],
          layout: {
            name: "cose",
            animate: true,
            fit: true,
            padding: 50,
          },
        });
      })
      .catch((err) => {
        console.error("Graph fetch failed", err);
        setError("Failed to load graph data.");
      });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📊 Graph View</h1>
      {error && <p className="text-red-600">{error}</p>}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "80vh", background: "#fff", borderRadius: "0.5rem" }}
      />
    </main>
  );
}

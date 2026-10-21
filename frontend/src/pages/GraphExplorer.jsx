import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { 
  Share2, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter, 
  Layers, 
  Info, 
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';
import { api } from '../api/client';
import { NotificationBanner } from '../components/Notification';

const ALL_LABELS = [
  'ROLE',
  'USER',
  'LOCATION',
  'DISASTER',
  'EMERGENCY_REQUEST',
  'VOLUNTEER',
  'ASSIGNMENT',
  'RESOURCE',
  'INVENTORY'
];

export function GraphExplorerPage() {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);

  // Active label filters
  const [selectedLabels, setSelectedLabels] = useState(ALL_LABELS);
  const [layoutName, setLayoutName] = useState('cose');
  const [graphSummary, setGraphSummary] = useState({ nodes: 0, edges: 0 });
  const [labelColors, setLabelColors] = useState({});

  const fetchGraphData = async () => {
    setLoading(true);
    setError(null);
    try {
      const typesQuery = selectedLabels.join(',');
      const res = await api.getGraphData({ types: typesQuery, limit: 200 });

      if (res.success) {
        setGraphSummary(res.summary);
        if (res.labelColors) setLabelColors(res.labelColors);
        renderCytoscape(res.elements);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch graph elements from Neo4j');
    } finally {
      setLoading(false);
    }
  };

  const renderCytoscape = (elements) => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(name)',
            'background-color': 'data(color)',
            'color': '#f8fafc',
            'font-family': 'Plus Jakarta Sans, sans-serif',
            'font-size': '11px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.8,
            'text-background-padding': 3,
            'text-background-shape': 'roundrectangle',
            'width': 36,
            'height': 36,
            'border-width': 2,
            'border-color': '#ffffff',
            'border-opacity': 0.3,
            'overlay-opacity': 0
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#14b8a6',
            'border-opacity': 1,
            'shadow-blur': 15,
            'shadow-color': '#14b8a6',
            'shadow-opacity': 0.8
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#475569',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#64748b',
            'arrow-scale': 1.1,
            'label': 'data(label)',
            'font-size': '9px',
            'font-family': 'JetBrains Mono, monospace',
            'color': '#94a3b8',
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'text-background-color': '#020617',
            'text-background-opacity': 0.7,
            'text-background-padding': 2,
            'text-background-shape': 'roundrectangle',
            'overlay-opacity': 0
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'width': 3,
            'line-color': '#14b8a6',
            'target-arrow-color': '#14b8a6'
          }
        }
      ],
      layout: {
        name: layoutName,
        animate: false,
        randomize: false,
        nodeRepulsion: 650000,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 1000
      }
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedElement({
        type: 'node',
        id: node.id(),
        label: node.data('label'),
        name: node.data('name'),
        color: node.data('color'),
        properties: node.data('properties') || {}
      });
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      setSelectedElement({
        type: 'edge',
        id: edge.id(),
        label: edge.data('label'),
        source: edge.data('source'),
        target: edge.data('target'),
        properties: edge.data('properties') || {}
      });
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedElement(null);
      }
    });

    cyRef.current = cy;
  };

  useEffect(() => {
    fetchGraphData();
    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [selectedLabels, layoutName]);

  const toggleLabel = (label) => {
    if (selectedLabels.includes(label)) {
      if (selectedLabels.length === 1) return; // Keep at least one
      setSelectedLabels(selectedLabels.filter(l => l !== label));
    } else {
      setSelectedLabels([...selectedLabels, label]);
    }
  };

  const selectAllLabels = () => setSelectedLabels(ALL_LABELS);

  const zoomIn = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  const zoomOut = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  const fitView = () => cyRef.current && cyRef.current.fit(undefined, 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-teal-400" />
            Interactive Neo4j Graph Explorer
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Live topological visualization of disaster zones, relief resources, volunteer dispatches, and emergency links
          </p>
        </div>

        {/* Graph Controls */}
        <div className="flex items-center gap-2">
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-semibold"
          >
            <option value="cose">Force-Directed (CoSE)</option>
            <option value="concentric">Concentric Layout</option>
            <option value="circle">Circular Layout</option>
            <option value="breadthfirst">Hierarchical Tree</option>
            <option value="grid">Grid Layout</option>
          </select>

          <button
            onClick={fetchGraphData}
            disabled={loading}
            title="Refresh graph from Neo4j"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <NotificationBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* Entity Labels Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            Filter Nodes By Entity Label ({selectedLabels.length}/{ALL_LABELS.length} Active):
          </span>
          <button
            onClick={selectAllLabels}
            className="text-[11px] font-semibold text-teal-400 hover:underline"
          >
            Select All
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_LABELS.map(lbl => {
            const active = selectedLabels.includes(lbl);
            const color = labelColors[lbl] || '#94a3b8';
            return (
              <button
                key={lbl}
                onClick={() => toggleLabel(lbl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-2 ${
                  active
                    ? 'bg-slate-900 border-slate-700 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-900 text-slate-600 opacity-60'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: active ? color : '#475569' }}
                />
                <span>{lbl}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Graph Canvas Container */}
      <div className="relative glass-panel rounded-2xl border border-slate-800 overflow-hidden h-[620px] flex">
        {/* Cytoscape Canvas */}
        <div ref={containerRef} className="flex-1 h-full w-full bg-slate-950/90 relative">
          {loading && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mb-2" />
              <span>Querying Neo4j nodes and traversals...</span>
            </div>
          )}
        </div>

        {/* Viewport Zoom & Fit Toolbar Overlay */}
        <div className="absolute left-4 bottom-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
          <button
            onClick={zoomIn}
            title="Zoom In"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            title="Zoom Out"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={fitView}
            title="Fit to Screen"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Graph Meta Overlay Indicator */}
        <div className="absolute left-4 top-4 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <span>Nodes: <strong className="text-white">{graphSummary.nodes}</strong></span>
          <span>•</span>
          <span>Edges: <strong className="text-white">{graphSummary.edges}</strong></span>
        </div>

        {/* Node / Edge Inspector Drawer */}
        {selectedElement && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/95 backdrop-blur-md p-5 overflow-y-auto flex-shrink-0 z-20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-400" />
                  {selectedElement.type === 'node' ? 'Node Inspector' : 'Relationship'}
                </span>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {selectedElement.type === 'node' ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-slate-950 text-sm shadow-md"
                      style={{ backgroundColor: selectedElement.color }}
                    >
                      {selectedElement.label.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm leading-tight">{selectedElement.name}</h3>
                      <span className="inline-block px-2 py-0.5 mt-1 rounded bg-slate-800 text-teal-300 font-mono text-[10px]">
                        :{selectedElement.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Neo4j Properties
                    </p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                      {Object.keys(selectedElement.properties).length > 0 ? (
                        Object.entries(selectedElement.properties).map(([key, val]) => (
                          <div key={key} className="flex flex-col border-b border-slate-900 pb-1.5 last:border-0 last:pb-0">
                            <span className="text-slate-500 text-[10px]">{key}</span>
                            <span className="text-slate-200 text-xs break-all">{String(val)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">No extra properties</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="font-mono font-bold text-teal-400 text-sm">
                      [:{selectedElement.label}]
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">Directed Graph Edge</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Relationship Attributes
                    </p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                      {Object.keys(selectedElement.properties).length > 0 ? (
                        Object.entries(selectedElement.properties).map(([key, val]) => (
                          <div key={key} className="flex flex-col">
                            <span className="text-slate-500 text-[10px]">{key}</span>
                            <span className="text-slate-200 text-xs">{String(val)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">Standard relationship topology</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 mt-6 text-center">
              <p className="text-[10px] text-slate-500">
                Click canvas background to deselect
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

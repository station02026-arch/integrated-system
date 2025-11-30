import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Circle, Line, Text, Group, Rect } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---
type NodeType = 'Start' | 'Elbow' | 'Tee' | 'Valve' | 'End';
type MaterialType = 'HIVP' | 'VP';
type DiameterType = '13' | '20' | '25';

interface NodeData {
    id: string;
    type: NodeType;
    x: number;
    y: number;
    angle: number; // 0-360
    material: MaterialType;
    diameter: DiameterType;
}

interface EdgeData {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    material: MaterialType;
    diameter: DiameterType;
    length: number; // Calculated length
}

interface DrawingData {
    nodes: NodeData[];
    edges: EdgeData[];
}

interface PipeLinkerEditorProps {
    initialData?: DrawingData;
    onSave: (data: DrawingData) => void;
}

// --- Constants ---
const GRID_SIZE = 20;
const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const COLORS = {
    HIVP: '#3b82f6', // Blue
    VP: '#9ca3af',   // Gray
    SELECTED: '#ef4444', // Red
    GUIDE: 'rgba(255, 165, 0, 0.5)',
};

const PipeLinkerEditor: React.FC<PipeLinkerEditorProps> = ({ initialData, onSave }) => {
    // --- State ---
    const [nodes, setNodes] = useState<NodeData[]>(initialData?.nodes || []);
    const [edges, setEdges] = useState<EdgeData[]>(initialData?.edges || []);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [activeMaterial, setActiveMaterial] = useState<MaterialType>('HIVP');
    const [activeDiameter, setActiveDiameter] = useState<DiameterType>('20');

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null);
    const [previewNode, setPreviewNode] = useState<{ x: number, y: number, angle: number } | null>(null);

    // Layout State
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const stageRef = useRef<any>(null);

    // --- Effects ---
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', updateSize);
        updateSize();

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // --- Helpers ---
    const getDistance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    const getAngle = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        return angle;
    };

    const snapToAngle = (angle: number) => {
        return SNAP_ANGLES.reduce((prev, curr) =>
            Math.abs(curr - angle) < Math.abs(prev - angle) ? curr : prev
        );
    };

    // --- Actions ---
    const handleStageTap = (e: any) => {
        // If tapped on empty space and no node selected, do nothing (or deselect)
        if (e.target === e.target.getStage()) {
            setSelectedNodeId(null);
            setPreviewNode(null);
        }
    };

    const handleAddStartNode = () => {
        const stage = stageRef.current;
        const center = stage ? { x: stage.width() / 2, y: stage.height() / 2 } : { x: 200, y: 200 };

        const newNode: NodeData = {
            id: uuidv4(),
            type: 'Start',
            x: center.x,
            y: center.y,
            angle: 0,
            material: activeMaterial,
            diameter: activeDiameter
        };
        setNodes([...nodes, newNode]);
        setSelectedNodeId(newNode.id);
    };

    const handleDragStart = (e: any, nodeId: string) => {
        e.cancelBubble = true;
        setSelectedNodeId(nodeId);
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        setDragStartPos(pos);
        setIsDragging(true);
    };

    const handleDragMove = (e: any) => {
        if (!isDragging || !selectedNodeId) return;

        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        const sourceNode = nodes.find(n => n.id === selectedNodeId);

        if (sourceNode && pos) {
            const angle = getAngle(sourceNode, pos);
            const snappedAngle = snapToAngle(angle);
            const distance = getDistance(sourceNode, pos);

            // Calculate preview position based on snapped angle
            const rad = snappedAngle * Math.PI / 180;
            const previewX = sourceNode.x + Math.cos(rad) * distance;
            const previewY = sourceNode.y + Math.sin(rad) * distance;

            setPreviewNode({
                x: previewX,
                y: previewY,
                angle: snappedAngle
            });
        }
    };

    const handleDragEnd = (e: any) => {
        if (isDragging && selectedNodeId && previewNode) {
            // Create new Node and Edge
            const newNodeId = uuidv4();
            const newNode: NodeData = {
                id: newNodeId,
                type: 'Elbow', // Default to Elbow, logic can be smarter
                x: previewNode.x,
                y: previewNode.y,
                angle: previewNode.angle,
                material: activeMaterial,
                diameter: activeDiameter
            };

            const newEdge: EdgeData = {
                id: uuidv4(),
                fromNodeId: selectedNodeId,
                toNodeId: newNodeId,
                material: activeMaterial,
                diameter: activeDiameter,
                length: getDistance(nodes.find(n => n.id === selectedNodeId)!, newNode)
            };

            setNodes([...nodes, newNode]);
            setEdges([...edges, newEdge]);
            setSelectedNodeId(newNodeId); // Auto-select new node for continuous drawing
        }

        setIsDragging(false);
        setPreviewNode(null);
        setDragStartPos(null);
    };

    const handleSave = () => {
        onSave({ nodes, edges });
    };

    const handleClear = () => {
        if (confirm('図面をクリアしますか？')) {
            setNodes([]);
            setEdges([]);
            setSelectedNodeId(null);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50">
            {/* Toolbar */}
            <div className="bg-white p-2 shadow-sm flex justify-between items-center z-10">
                <div className="flex space-x-2">
                    <select
                        value={activeMaterial}
                        onChange={(e) => setActiveMaterial(e.target.value as MaterialType)}
                        className="border rounded p-1 text-sm"
                    >
                        <option value="HIVP">HIVP (耐衝撃)</option>
                        <option value="VP">VP (一般)</option>
                    </select>
                    <select
                        value={activeDiameter}
                        onChange={(e) => setActiveDiameter(e.target.value as DiameterType)}
                        className="border rounded p-1 text-sm"
                    >
                        <option value="13">13mm</option>
                        <option value="20">20mm</option>
                        <option value="25">25mm</option>
                    </select>
                </div>
                <div className="flex space-x-2">
                    <button onClick={handleClear} className="text-red-500 text-sm px-2">クリア</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-bold">保存</button>
                </div>
            </div>

            {/* Canvas Area */}
            <div ref={containerRef} className="flex-grow relative overflow-hidden bg-white border-t border-b border-gray-200 touch-none">
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                            onClick={handleAddStartNode}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg pointer-events-auto animate-bounce"
                        >
                            Start Drawing
                        </button>
                    </div>
                )}

                <Stage
                    width={dimensions.width}
                    height={dimensions.height}
                    ref={stageRef}
                    onMouseDown={handleStageTap}
                    onTouchStart={handleStageTap}
                    onMouseMove={handleDragMove}
                    onTouchMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onTouchEnd={handleDragEnd}
                >
                    <Layer>
                        {/* Edges (Pipes) */}
                        {edges.map(edge => {
                            const from = nodes.find(n => n.id === edge.fromNodeId);
                            const to = nodes.find(n => n.id === edge.toNodeId);
                            if (!from || !to) return null;
                            return (
                                <Group key={edge.id}>
                                    <Line
                                        points={[from.x, from.y, to.x, to.y]}
                                        stroke={COLORS[edge.material]}
                                        strokeWidth={edge.diameter === '13' ? 4 : edge.diameter === '20' ? 6 : 8}
                                        lineCap="round"
                                        lineJoin="round"
                                    />
                                    {/* Dynamic Label */}
                                    <Text
                                        x={(from.x + to.x) / 2}
                                        y={(from.y + to.y) / 2 - 10}
                                        text={`${edge.material} ${edge.diameter}`}
                                        fontSize={10}
                                        fill="#555"
                                    />
                                </Group>
                            );
                        })}

                        {/* Preview Line */}
                        {isDragging && selectedNodeId && previewNode && (
                            <Line
                                points={[
                                    nodes.find(n => n.id === selectedNodeId)!.x,
                                    nodes.find(n => n.id === selectedNodeId)!.y,
                                    previewNode.x,
                                    previewNode.y
                                ]}
                                stroke={COLORS.GUIDE}
                                strokeWidth={4}
                                dash={[10, 5]}
                            />
                        )}

                        {/* Nodes (Fittings) */}
                        {nodes.map(node => (
                            <Group
                                key={node.id}
                                x={node.x}
                                y={node.y}
                                draggable={false} // Nodes are fixed once placed, unless moved explicitly (future)
                            >
                                <Circle
                                    radius={node.diameter === '13' ? 8 : 10}
                                    fill={selectedNodeId === node.id ? COLORS.SELECTED : 'white'}
                                    stroke={COLORS[node.material]}
                                    strokeWidth={3}
                                />
                                {/* Touch Target (Invisible larger area) */}
                                <Circle
                                    radius={20}
                                    fill="transparent"
                                    onMouseDown={(e) => handleDragStart(e, node.id)}
                                    onTouchStart={(e) => handleDragStart(e, node.id)}
                                />
                            </Group>
                        ))}

                        {/* Preview Node */}
                        {previewNode && (
                            <Circle
                                x={previewNode.x}
                                y={previewNode.y}
                                radius={10}
                                fill="rgba(255, 165, 0, 0.5)"
                            />
                        )}
                    </Layer>
                </Stage>
            </div>

            {/* Helper Text */}
            <div className="bg-gray-100 p-2 text-xs text-gray-500 text-center">
                {selectedNodeId
                    ? "Drag from the red node to extend pipe (snaps to 45°)"
                    : "Tap a node to select it"}
            </div>
        </div>
    );
};

export default PipeLinkerEditor;

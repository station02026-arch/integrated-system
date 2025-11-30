import React, { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------
interface Node {
    id: number;
    x: number;
    y: number;
}

interface Shape {
    id: string;
    type: string;
    a?: number;
    b?: number;
    c?: number; // for cheese
    x?: number; // for label/text
    y?: number; // for label/text
    text?: string;
    color?: string;
    flipped?: boolean;
    baseAngle?: number;
    branchAngle?: number;
    propType?: string;
    propSize1?: string;
    propSize2?: string;
    propLength?: string;
    propFontSize?: number;
    targetShapeId?: string;
    targetType?: string;
    targetX?: number;
    targetY?: number;
    [key: string]: any;
}

interface CanvasAppProps {
    initialData?: { nodes: Node[], shapes: Shape[], nextNodeId: number };
    onSave: (data: { nodes: Node[], shapes: Shape[], nextNodeId: number }) => void;
}

// ---------------------------------------------------------
// Constants
// ---------------------------------------------------------
const METER_ITEMS: any[] = [
    { kind: "text", x: 0, y: 0, text: "M", size: 100 },
    { kind: "rect", x: -20, y: -20, w: 40, h: 40 },
    { kind: "line", x1: 20, y1: 0, x2: 50, y2: 0 },
    { kind: "line", x1: 35, y1: -15, x2: 35, y2: 15 },
];

const ELBOW_ITEMS = [
    { kind: "line", x1: 0, y1: 0, x2: -25, y2: 0 },
    { kind: "line", x1: 0, y1: 0, x2: 0, y2: 25 },
    { kind: "line", x1: -25, y1: -20, x2: -25, y2: 20 },
    { kind: "line", x1: -25, y1: 20, x2: -45, y2: 20 },
    { kind: "line", x1: -25, y1: -20, x2: -45, y2: -20 },
    { kind: "line", x1: -20, y1: 25, x2: 20, y2: 25 },
    { kind: "line", x1: -20, y1: 25, x2: -20, y2: 45 },
    { kind: "line", x1: 20, y1: 25, x2: 20, y2: 45 }
];
const ELBOW_X_ITEMS = [ELBOW_ITEMS[0], ELBOW_ITEMS[2], ELBOW_ITEMS[3], ELBOW_ITEMS[4]];
const ELBOW_Y_ITEMS = [ELBOW_ITEMS[1], ELBOW_ITEMS[5], ELBOW_ITEMS[6], ELBOW_ITEMS[7]];

const ELBOW_IN = { x: -45, y: 0 };
const ELBOW_PIVOT = { x: 0, y: 0 };
const ELBOW_OUT = { x: 0, y: 45 };

const NAME_MAP: any = {
    "socket": "HIソケット φ13",
    "elbow": "HIエルボ φ13",
    "cheese": "HIチーズ φ13",
    "mcUnion": "MCユニオン φ13",
    "meter": "メーター器",
    "hojoValve": "逆止弁付補助バルブ φ13",
    "fixedCustom": "メーター用エラスジョイント φ13",
};
const BASE_NAMES: any = {
    "socket": "ソケット",
    "elbow": "エルボ",
    "cheese": "チーズ",
    "mcUnion": "MCユニオン",
    "hojoValve": "逆止弁付補助バルブ",
    "fixedCustom": "メーター用エラス",
    "meter": "メーター器"
};

const CanvasApp: React.FC<CanvasAppProps> = ({ initialData, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<'drawing' | 'label'>('drawing');
    const [tool, setTool] = useState('select');
    const [pipeColor, setPipeColor] = useState('blue');
    const [zoom, setZoom] = useState(0.8);
    const [status, setStatus] = useState('作図モード: ツールを選択してください。');

    // Refs for state that doesn't need to trigger re-renders (Canvas logic)
    const state = useRef({
        nodes: initialData?.nodes || [] as Node[],
        shapes: initialData?.shapes || [] as Shape[],
        nextNodeId: initialData?.nextNodeId || 1,
        selectedShape: null as Shape | null,
        undoStack: [] as any[],
        redoStack: [] as any[],
        tempStartNode: null as Node | null,
        tempCheeseNodeB: null as Node | null,
        tempEndPos: null as { x: number, y: number } | null,
        isPreviewFlipped: false,
        elbowPreviewAngle: 0,
        panX: 0,
        panY: 0,
        zoom: 0.8,
        isPanning: false,
        isSpaceDown: false,
        panStart: { x: 0, y: 0 },
        draggingGroup: null as { type: 'node', id: number, startX: number, startY: number } | null,
        draggingLabel: null as { shape: Shape, startX: number, startY: number, startMouse: { x: number, y: number } } | null,
        snapIndicator: null as any,
        socketScale: 1.0,
        elbowScale: 1.0,
        isExporting: false,
        seqEditList: [] as Shape[],
        seqEditIndex: 0,
    });

    // Property Panel State (React state for UI binding)
    const [selectedShapeProps, setSelectedShapeProps] = useState<Shape | null>(null);

    // ---------------------------------------------------------
    // Helper Functions
    // ---------------------------------------------------------
    const genId = () => "s_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const rot2 = (angle: number) => ({ c: Math.cos(angle), s: Math.sin(angle) });
    const canonicalAngle = (angle: number) => {
        if (angle > Math.PI / 2) angle -= Math.PI;
        else if (angle <= -Math.PI / 2) angle += Math.PI;
        return angle;
    };
    const getStrokeColor = (type: string) => type === "red" ? "#dc2626" : "#2563eb";
    const getShapeRadius = (type: string) => {
        switch (type) {
            case "socket": return 20;
            case "cheese": return 25;
            case "mcUnion": return 25;
            case "hojoValve": return 20;
            case "fixedCustom": return 20;
            case "elbow": return 15;
            case "pipe": return 0;
            default: return 20;
        }
    };
    const getNode = (id: number) => state.current.nodes.find(n => n.id === id);

    const pushHistory = () => {
        state.current.undoStack.push({
            nodes: JSON.parse(JSON.stringify(state.current.nodes)),
            shapes: JSON.parse(JSON.stringify(state.current.shapes)),
            nextNodeId: state.current.nextNodeId,
        });
        state.current.redoStack = [];
        if (state.current.undoStack.length > 50) state.current.undoStack.shift();
    };

    const redrawAll = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { zoom, panX, panY, isExporting, nodes, shapes, selectedShape, tempStartNode, tempCheeseNodeB, tempEndPos, snapIndicator, isPreviewFlipped, elbowPreviewAngle } = state.current;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(zoom, 0, 0, zoom, panX, panY);

        if (!isExporting) drawGrid(ctx);

        shapes.forEach(s => {
            if (s === selectedShape && !isExporting) drawSelectionHalo(ctx, s);
            drawShapeDispatch(ctx, s);
        });

        if (!isExporting) {
            ctx.fillStyle = "#0ea5e9";
            nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, 3 / zoom, 0, Math.PI * 2); ctx.fill(); });
        }

        // Preview Logic
        if (tempStartNode && !isExporting) {
            if (tool === "cheese" && tempCheeseNodeB) {
                if (tempEndPos) {
                    ctx.save(); ctx.globalAlpha = 0.6;
                    const dummy: Shape = { type: tool, id: "temp_preview", a: tempStartNode.id, b: tempCheeseNodeB.id, c: undefined, color: pipeColor, flipped: isPreviewFlipped };
                    drawShapeDispatch(ctx, dummy, true);
                    ctx.restore();
                    const cx = (tempStartNode.x + tempCheeseNodeB.x) / 2;
                    const cy = (tempStartNode.y + tempCheeseNodeB.y) / 2;
                    ctx.save(); ctx.strokeStyle = "orange"; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
                    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tempEndPos.x, tempEndPos.y); ctx.stroke();
                    ctx.restore();
                }
            } else if (tempEndPos) {
                ctx.save(); ctx.globalAlpha = 0.6;
                const dummy: Shape = { type: tool, id: "temp_preview", a: tempStartNode.id, b: undefined, color: pipeColor, flipped: isPreviewFlipped };
                drawShapeDispatch(ctx, dummy, true);
                ctx.restore();
                ctx.save(); ctx.strokeStyle = "orange"; ctx.lineWidth = 2; ctx.setLineDash([2, 2]);
                ctx.beginPath(); ctx.arc(tempEndPos.x, tempEndPos.y, 6 / zoom, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(tempStartNode.x, tempStartNode.y, 2 / zoom, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
        }
        if (snapIndicator && !isExporting) {
            ctx.save(); ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(snapIndicator.x, snapIndicator.y, 8 / zoom, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    };

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
        const { panX, panY, zoom } = state.current;
        const step = 40;
        ctx.save(); ctx.strokeStyle = "#374151"; ctx.lineWidth = 0.5; ctx.setLineDash([2, 4]);
        const left = -panX / zoom; const top = -panY / zoom;
        const right = (ctx.canvas.width - panX) / zoom; const bottom = (ctx.canvas.height - panY) / zoom;
        const startX = Math.floor(left / step) * step; const startY = Math.floor(top / step) * step;
        for (let x = startX; x < right; x += step) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); }
        for (let y = startY; y < bottom; y += step) { ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }
        ctx.restore();
    };

    const drawSelectionHalo = (ctx: CanvasRenderingContext2D, s: Shape) => {
        if (!s) return;
        const nA = s.a ? getNode(s.a) : null;
        const nB = s.b ? getNode(s.b) : null;
        const zoom = state.current.zoom;
        ctx.save(); ctx.strokeStyle = "rgba(236, 72, 153, 0.4)"; ctx.lineWidth = 12 / zoom; ctx.lineCap = "round"; ctx.beginPath();
        if (s.type === "label") {
            const w = ctx.measureText(s.text || "").width || 50;
            ctx.strokeRect((s.x || 0) - 5, (s.y || 0) - 15, w + 10, 20);
            ctx.restore(); return;
        }
        if (s.type === "text") ctx.arc(s.x || 0, s.y || 0, 20, 0, Math.PI * 2);
        else if (s.type === "elbow" && nA) ctx.arc(nA.x, nA.y, 25, 0, Math.PI * 2);
        else if (nA && nB) {
            if (s.type === "pipe") { ctx.moveTo(nA.x, nA.y); ctx.lineTo(nB.x, nB.y); }
            else { const cx = (nA.x + nB.x) / 2, cy = (nA.y + nB.y) / 2; ctx.arc(cx, cy, 20, 0, Math.PI * 2); }
        }
        ctx.stroke(); ctx.restore();
    };

    const drawShapeDispatch = (ctx: CanvasRenderingContext2D, s: Shape, isPreview = false) => {
        if (s.type === "label") { drawLabelShape(ctx, s, s === state.current.selectedShape); return; }
        const nA = (s.a ? getNode(s.a) : null) || state.current.tempStartNode;

        let nB = null;
        if (s.type === "cheese" && isPreview && state.current.tempCheeseNodeB) {
            nB = state.current.tempCheeseNodeB;
        } else {
            nB = (s.b ? getNode(s.b) : null) || (isPreview ? state.current.tempEndPos : null);
        }

        if (!nA) return;
        if (s.type === "text") { ctx.save(); ctx.fillStyle = "#111827"; ctx.font = "14px sans-serif"; ctx.fillText(s.text || "", s.x || 0, s.y || 0); ctx.restore(); return; }
        if (s.type === "elbow") {
            let base = s.baseAngle, branch = s.branchAngle;
            if (isPreview) {
                const connected = getConnectedPipeAngle(nA.id);
                base = (connected !== null) ? connected : 0;
                branch = state.current.elbowPreviewAngle;
            }
            if (base == null) base = 0; if (branch == null) branch = base + Math.PI / 2;
            drawElbowAt(ctx, nA, base, branch, s.color); return;
        }
        if (!nB) return;

        if (s.type === "pipe") { ctx.save(); ctx.strokeStyle = getStrokeColor(s.color || "blue"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(nA.x, nA.y); ctx.lineTo(nB.x, nB.y); ctx.stroke(); ctx.restore(); }
        else if (s.type === "socket") drawSocketBetweenNodes(ctx, nA, nB, s.color, s.flipped);
        else if (s.type === "cheese") {
            const nC = (s.c ? getNode(s.c) : null) || (isPreview && state.current.tempEndPos ? state.current.tempEndPos : null);
            drawCheese(ctx, nA, nB, nC, s.color, s.flipped);
        }
        else if (s.type === "mcUnion") drawMcUnionBetweenNodes(ctx, nA, nB, s.color, s.flipped);
        else if (s.type === "meter") drawMeterBetweenNodes(ctx, nA, nB, s.flipped);
        else if (s.type === "hojoValve") { const cx = (nA.x + nB.x) / 2, cy = (nA.y + nB.y) / 2, a = canonicalAngle(Math.atan2(nB.y - nA.y, nB.x - nA.x)); drawHojoValveAt(ctx, cx, cy, a, s.color, s.flipped); }
        else if (s.type === "fixedCustom") {
            let a = canonicalAngle(Math.atan2(nB.y - nA.y, nB.x - nA.x));
            const cx = (nA.x + nB.x) / 2, cy = (nA.y + nB.y) / 2;
            drawFixedCustomAt(ctx, cx, cy, a, s.color, s.flipped);
        }
    };

    const drawLabelShape = (ctx: CanvasRenderingContext2D, s: Shape, isSelected: boolean) => {
        if (!s.text) return;
        ctx.save();
        const fontSize = s.propFontSize || 20;
        ctx.font = `${fontSize}px system-ui`;
        ctx.textBaseline = "bottom";
        ctx.textAlign = "left";
        const textWidth = ctx.measureText(s.text).width;
        const tx = s.x || 0;
        const ty = s.y || 0;
        const txT = s.targetX || 0;
        const tyT = s.targetY || 0;

        ctx.strokeStyle = isSelected ? "#ec4899" : "#111827";
        ctx.fillStyle = isSelected ? "#ec4899" : "#111827";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.fillText(s.text, tx, ty);

        if (s.targetType !== 'pipe') {
            ctx.beginPath(); ctx.moveTo(tx, ty + 2); ctx.lineTo(tx + textWidth, ty + 2); ctx.stroke();
        }
        if (s.targetType !== 'pipe' && s.targetType !== undefined) {
            const textCenter = tx + textWidth / 2;
            let startX = (txT < textCenter) ? tx : tx + textWidth;
            const startY = ty + 2;
            const shapeRad = getShapeRadius(s.targetType || "socket");
            const offset = shapeRad + 5;
            const dx = txT - startX;
            const dy = tyT - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > offset) {
                const angle = Math.atan2(dy, dx);
                const endX = txT - Math.cos(angle) * offset;
                const endY = tyT - Math.sin(angle) * offset;
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
                ctx.beginPath(); ctx.arc(endX, endY, 1.5, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    };

    const drawSocketBetweenNodes = (ctx: CanvasRenderingContext2D, n1: any, n2: any, colorType: any, flipped: any) => {
        const col = getStrokeColor(colorType);
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const cx = (n1.x + n2.x) / 2, cy = (n1.y + n2.y) / 2;
        const angle = canonicalAngle(Math.atan2(dy, dx));
        const s = state.current.socketScale;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.scale(flipped ? -1 : 1, 1);
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        function line(x1: number, y1: number, x2: number, y2: number) { ctx.beginPath(); ctx.moveTo(x1 * s, y1 * s); ctx.lineTo(x2 * s, y2 * s); ctx.stroke(); }
        line(-20, 0, 20, 0); line(20, 0, 20, -20); line(20, -20, 30, -20); line(20, 0, 20, 20);
        line(20, 20, 35, 20); line(35, 20, 40, 20); line(30, -20, 40, -20);
        line(-20, -20, -20, 20); line(-20, 20, -40, 20); line(-20, -20, -40, -20);
        ctx.restore();
    };

    const drawCheese = (ctx: CanvasRenderingContext2D, nA: any, nB: any, nC: any, colorType: any, flipped: any) => {
        drawSocketBetweenNodes(ctx, nA, nB, colorType, flipped);
        if (!nC) return;
        const cx = (nA.x + nB.x) / 2;
        const cy = (nA.y + nB.y) / 2;
        const dx = nC.x - cx;
        const dy = nC.y - cy;
        const branchAngle = Math.atan2(dy, dx);
        const rotation = branchAngle - Math.PI / 2;
        const col = getStrokeColor(colorType);
        const s = state.current.elbowScale;
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.translate(cx, cy); ctx.rotate(rotation);
        const items = ELBOW_Y_ITEMS;
        for (const it of items) {
            ctx.beginPath(); ctx.moveTo(it.x1 * s, it.y1 * s); ctx.lineTo(it.x2 * s, it.y2 * s); ctx.stroke();
        }
        ctx.restore();
    };

    const drawMcUnionBetweenNodes = (ctx: CanvasRenderingContext2D, n1: any, n2: any, colorType: any, flipped: any) => {
        const col = getStrokeColor(colorType);
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const cx = (n1.x + n2.x) / 2, cy = (n1.y + n2.y) / 2;
        const angle = canonicalAngle(Math.atan2(dy, dx));
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.scale(flipped ? -1 : 1, 1);
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        function line(x1: number, y1: number, x2: number, y2: number) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
        line(-25, -10, 25, -10); line(-25, 10, 25, 10); line(25, -20, 35, -20); line(35, -20, 35, 20);
        line(35, 20, 25, 20); line(-25, -20, -35, -20); line(-35, -20, -35, 20); line(-35, 20, -25, 20);
        ctx.restore();
    };

    const drawMeterBetweenNodes = (ctx: CanvasRenderingContext2D, n1: any, n2: any, flipped: any) => {
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const angle = Math.atan2(dy, dx);
        const distToCenter = flipped ? 50 : 20;
        const cx = n1.x + Math.cos(angle) * distToCenter;
        const cy = n1.y + Math.sin(angle) * distToCenter;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        if (flipped) ctx.scale(-1, 1);
        let textRot = 0;
        if (Math.abs(angle) > Math.PI / 2) textRot = Math.PI;
        for (const item of METER_ITEMS) {
            if (item.kind === "rect") { ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.strokeRect(item.x, item.y, item.w, item.h); }
            else if (item.kind === "line") { ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(item.x1, item.y1); ctx.lineTo(item.x2, item.y2); ctx.stroke(); }
            else if (item.kind === "text") {
                ctx.save(); ctx.translate(item.x, item.y);
                if (flipped) ctx.scale(-1, 1);
                ctx.rotate(textRot); ctx.fillStyle = "#000000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.font = (item.size * 0.4) + "px system-ui"; ctx.fillText(item.text, 0, 0); ctx.restore();
            }
        }
        ctx.restore();
    };

    const drawHojoValveAt = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, colorType: any, flipped: any) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(flipped ? -1 : 1, 1);
        ctx.strokeStyle = getStrokeColor(colorType); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, -40); ctx.lineTo(10, -40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(40, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, -15); ctx.lineTo(30, 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-40, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-30, -15); ctx.lineTo(-30, 15); ctx.stroke();
        ctx.restore();
    };

    const drawFixedCustomAt = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, colorType: any, flipped: any) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        if (flipped) ctx.rotate(Math.PI); // Using flipped as isRotated180
        ctx.strokeStyle = getStrokeColor(colorType); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(15, -20); ctx.lineTo(15, 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, 20); ctx.lineTo(35, 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, -20); ctx.lineTo(35, -20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-25, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(-30, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-35, 0); ctx.stroke();
        ctx.restore();
    };

    const drawElbowAt = (ctx: CanvasRenderingContext2D, nodeA: any, base: number, branch: number, colorType: any) => {
        const col = getStrokeColor(colorType);
        const s = state.current.elbowScale;
        const Rb = rot2(base), Rbr = rot2(branch);
        const pvx = (ELBOW_PIVOT.x - ELBOW_IN.x) * s, pvy = (ELBOW_PIVOT.y - ELBOW_IN.y) * s;
        const pvxW = nodeA.x + pvx * Rb.c - pvy * Rb.s, pvyW = nodeA.y + pvx * Rb.s + pvy * Rb.c;
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2;
        function drawItems(items: any[], rot: any) {
            for (const it of items) {
                const x1l = it.x1 * s, y1l = it.y1 * s, x2l = it.x2 * s, y2l = it.y2 * s;
                const originX = (items === ELBOW_X_ITEMS) ? ELBOW_IN.x * s : ELBOW_PIVOT.x * s;
                const originY = (items === ELBOW_X_ITEMS) ? ELBOW_IN.y * s : ELBOW_PIVOT.y * s;
                const rx1 = x1l - originX, ry1 = y1l - originY, rx2 = x2l - originX, ry2 = y2l - originY;
                const baseX = (items === ELBOW_X_ITEMS) ? nodeA.x : pvxW;
                const baseY = (items === ELBOW_X_ITEMS) ? nodeA.y : pvyW;
                const wx1 = baseX + rx1 * rot.c - ry1 * rot.s, wy1 = baseY + rx1 * rot.s + ry1 * rot.c;
                const wx2 = baseX + rx2 * rot.c - ry2 * rot.s, wy2 = baseY + rx2 * rot.s + ry2 * rot.c;
                ctx.beginPath(); ctx.moveTo(wx1, wy1); ctx.lineTo(wx2, wy2); ctx.stroke();
            }
        }
        drawItems(ELBOW_X_ITEMS, Rb);
        drawItems(ELBOW_Y_ITEMS, Rbr);
        ctx.restore();
    };

    const getConnectedPipeAngle = (nodeId: number) => {
        const p = state.current.shapes.findLast(s => s.type === "pipe" && (s.a === nodeId || s.b === nodeId));
        if (!p) return null;
        const n1 = getNode(p.a!); const n2 = getNode(p.b!);
        if (!n1 || !n2) return null;
        return (p.b === nodeId) ? Math.atan2(n2.y - n1.y, n2.x - n1.x) : Math.atan2(n1.y - n2.y, n1.x - n2.x);
    };

    // ---------------------------------------------------------
    // Event Handlers (Mouse & Keyboard)
    // ---------------------------------------------------------
    const getCanvasPos = (e: React.MouseEvent | React.WheelEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: ((e.clientX - rect.left) * scaleX - state.current.panX) / state.current.zoom,
            y: ((e.clientY - rect.top) * scaleY - state.current.panY) / state.current.zoom
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        const pos = getCanvasPos(e);
        const { nodes, shapes, zoom } = state.current;

        // Middle Click or Space+Click -> Pan
        if (e.button === 1 || state.current.isSpaceDown) {
            state.current.isPanning = true;
            state.current.panStart = { x: mouseX, y: mouseY };
            return;
        }

        // Select Mode
        if (tool === 'select') {
            // 1. Check for Nodes (Priority over shapes)
            const clickedNode = nodes.find(n => (n.x - pos.x) ** 2 + (n.y - pos.y) ** 2 <= (15 / zoom) ** 2);
            if (clickedNode) {
                state.current.draggingGroup = { type: 'node', id: clickedNode.id, startX: clickedNode.x, startY: clickedNode.y };
                setStatus("ノード移動中");
                return;
            }

            // 2. Check for Labels
            const label = shapes.find(s => s.type === "label" && (pos.x >= (s.x || 0) - 10 && pos.x <= (s.x || 0) + 100 && pos.y >= (s.y || 0) - 20 && pos.y <= (s.y || 0) + 10));
            if (label) {
                state.current.selectedShape = label;
                state.current.draggingLabel = { shape: label, startX: label.x || 0, startY: label.y || 0, startMouse: pos };
                setSelectedShapeProps(label);
                setStatus("ラベル移動中");
                redrawAll();
                return;
            }

            // 3. Check for Shapes
            const tol = 10 / zoom;
            let hit = null;
            for (let i = shapes.length - 1; i >= 0; i--) {
                const s = shapes[i];
                if (s.type === "label") continue;
                const nA = s.a ? getNode(s.a) : null;
                const nB = s.b ? getNode(s.b) : null;
                if (s.type === "text" && (pos.x - (s.x || 0)) ** 2 + (pos.y - (s.y || 0)) ** 2 < (20 / zoom) ** 2) { hit = s; break; }
                if (!nA) continue;
                if (s.type === "elbow" && (pos.x - nA.x) ** 2 + (pos.y - nA.y) ** 2 < (30 / zoom) ** 2) { hit = s; break; }
                if (!nB) continue;
                // Simplified pipe hit
                const cx = (nA.x + nB.x) / 2, cy = (nA.y + nB.y) / 2;
                if ((pos.x - cx) ** 2 + (pos.y - cy) ** 2 < (25 / zoom) ** 2) { hit = s; break; }
            }

            state.current.selectedShape = hit;
            setSelectedShapeProps(hit);
            setStatus(hit ? "選択中: " + hit.type : "選択解除");
            redrawAll();
            return;
        }

        // Drawing Logic
        let clickedNode = nodes.find(n => (n.x - pos.x) ** 2 + (n.y - pos.y) ** 2 <= (10 / zoom) ** 2);
        if (!clickedNode) {
            if (state.current.tempStartNode && state.current.tempEndPos) {
                clickedNode = { id: state.current.nextNodeId++, x: state.current.tempEndPos.x, y: state.current.tempEndPos.y };
                state.current.nodes.push(clickedNode);
            } else {
                clickedNode = { id: state.current.nextNodeId++, x: pos.x, y: pos.y };
                state.current.nodes.push(clickedNode);
            }
        }

        if (!state.current.tempStartNode) {
            state.current.tempStartNode = clickedNode;
            setStatus("始点決定。終点をクリックしてください");
        } else {
            // Finish drawing
            pushHistory();
            const newId = genId();
            const defaultProps = { propType: "HI", propSize1: "13", propSize2: "" };

            if (tool === 'elbow') {
                const connected = getConnectedPipeAngle(state.current.tempStartNode.id);
                const base = (connected !== null) ? connected : 0;
                const br = state.current.elbowPreviewAngle;
                // We need to create the end node based on preview
                // For simplicity, using clickedNode (which should match preview if snapped)
                state.current.shapes.push({ type: 'elbow', id: newId, a: state.current.tempStartNode.id, b: clickedNode.id, baseAngle: base, branchAngle: br, color: pipeColor, flipped: state.current.isPreviewFlipped, ...defaultProps });
            } else {
                state.current.shapes.push({ type: tool, id: newId, a: state.current.tempStartNode.id, b: clickedNode.id, color: pipeColor, flipped: state.current.isPreviewFlipped, ...defaultProps });
            }

            state.current.tempStartNode = null;
            state.current.tempEndPos = null;
            setStatus("配置完了");

            if (tool !== 'pipe') {
                setTool('pipe'); // Auto switch back to pipe
                setStatus("配置完了 (直管モードに戻りました)");
            }
            redrawAll();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        const pos = getCanvasPos(e);
        const { tempStartNode, zoom, isPanning, panStart, draggingGroup, draggingLabel } = state.current;

        // Panning
        if (isPanning) {
            const dx = mouseX - panStart.x;
            const dy = mouseY - panStart.y;
            state.current.panX += dx;
            state.current.panY += dy;
            state.current.panStart = { x: mouseX, y: mouseY };
            redrawAll();
            return;
        }

        // Dragging Node
        if (draggingGroup && draggingGroup.type === 'node') {
            const node = getNode(draggingGroup.id);
            if (node) {
                node.x = pos.x;
                node.y = pos.y;
                redrawAll();
            }
            return;
        }

        // Dragging Label
        if (draggingLabel) {
            const dx = pos.x - draggingLabel.startMouse.x;
            const dy = pos.y - draggingLabel.startMouse.y;
            draggingLabel.shape.x = draggingLabel.startX + dx;
            draggingLabel.shape.y = draggingLabel.startY + dy;
            redrawAll();
            return;
        }

        // Drawing Preview
        if (tempStartNode) {
            const dx = pos.x - tempStartNode.x;
            const dy = pos.y - tempStartNode.y;
            let angle = Math.atan2(dy, dx);
            const ANGLE_STEP = Math.PI / 4;
            angle = Math.round(angle / ANGLE_STEP) * ANGLE_STEP;

            let dist = Math.sqrt(dx * dx + dy * dy);
            // Fixed distances for fittings
            if (tool === "socket" || tool === "cheese") dist = 80;
            else if (tool === "mcUnion" || tool === "fixedCustom") dist = 70;
            else if (tool === "hojoValve") dist = 80;
            else if (tool === "meter") dist = 70;

            state.current.tempEndPos = { x: tempStartNode.x + Math.cos(angle) * dist, y: tempStartNode.y + Math.sin(angle) * dist };

            // Snap to existing node
            const near = state.current.nodes.find(n => (n.x - pos.x) ** 2 + (n.y - pos.y) ** 2 <= (10 / zoom) ** 2);
            if (near && near !== tempStartNode) {
                state.current.tempEndPos = { x: near.x, y: near.y };
            }

            // Elbow specific preview logic (simplified)
            if (tool === 'elbow') {
                state.current.elbowPreviewAngle = angle;
            }

            redrawAll();
        }
    };

    const handleMouseUp = () => {
        state.current.isPanning = false;
        state.current.draggingGroup = null;
        state.current.draggingLabel = null;
        redrawAll();
    };

    const handleWheel = (e: React.WheelEvent) => {
        const scaleBy = 1.1;
        const oldZoom = state.current.zoom;
        const newZoom = e.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
        const clampedZoom = Math.min(Math.max(newZoom, 0.1), 5);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

        // Zoom towards mouse pointer
        const wx = (mouseX - state.current.panX) / oldZoom;
        const wy = (mouseY - state.current.panY) / oldZoom;

        state.current.panX = mouseX - wx * clampedZoom;
        state.current.panY = mouseY - wy * clampedZoom;
        state.current.zoom = clampedZoom;

        setZoom(clampedZoom); // Force re-render
        redrawAll();
    };

    // ---------------------------------------------------------
    // Effects
    // ---------------------------------------------------------
    useEffect(() => {
        redrawAll();
    }, [tool, pipeColor, zoom]);

    // Initial Draw
    useEffect(() => {
        redrawAll();
    }, []);

    // Keyboard Events (Space for Pan)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                state.current.isSpaceDown = true;
                const canvas = canvasRef.current;
                if (canvas) canvas.style.cursor = 'grab';
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                state.current.isSpaceDown = false;
                state.current.isPanning = false;
                const canvas = canvasRef.current;
                if (canvas) canvas.style.cursor = 'crosshair';
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Save handler
    const handleSaveClick = () => {
        onSave({
            nodes: state.current.nodes,
            shapes: state.current.shapes,
            nextNodeId: state.current.nextNodeId
        });
    };

    return (
        <div className="flex h-full" onMouseUp={handleMouseUp}>
            {/* Sidebar */}
            <div className="w-64 bg-gray-900 text-white flex flex-col border-r border-gray-700">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="font-bold text-blue-400 mb-2">配管図ツール (React版)</h2>
                    <div className="flex gap-2 mb-2">
                        <button onClick={handleSaveClick} className="flex-1 bg-blue-600 text-xs py-1 rounded">保存</button>
                        <button onClick={() => { state.current.nodes = []; state.current.shapes = []; redrawAll(); }} className="flex-1 bg-red-800 text-xs py-1 rounded">クリア</button>
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                    {/* Tools */}
                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                        <div className="text-xs text-indigo-300 mb-2 font-bold">基本ツール</div>
                        <div className="grid grid-cols-2 gap-1">
                            <button onClick={() => setTool('select')} className={`p-1 text-xs rounded ${tool === 'select' ? 'bg-indigo-600' : 'bg-gray-700'}`}>選択</button>
                            <button onClick={() => {
                                if (state.current.selectedShape) {
                                    state.current.shapes = state.current.shapes.filter(s => s !== state.current.selectedShape);
                                    state.current.selectedShape = null;
                                    setSelectedShapeProps(null);
                                    redrawAll();
                                }
                            }} className="p-1 text-xs rounded bg-red-900 text-red-200">削除</button>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                        <div className="text-xs text-indigo-300 mb-2 font-bold">色 / 種別</div>
                        <div className="flex gap-1">
                            <button onClick={() => { setPipeColor('blue'); }} className={`flex-1 p-1 text-xs rounded ${pipeColor === 'blue' ? 'bg-blue-600' : 'bg-gray-700'}`}>既設(青)</button>
                            <button onClick={() => { setPipeColor('red'); }} className={`flex-1 p-1 text-xs rounded ${pipeColor === 'red' ? 'bg-red-600' : 'bg-gray-700'}`}>布設(赤)</button>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                        <div className="text-xs text-indigo-300 mb-2 font-bold">作図ツール</div>
                        <div className="grid grid-cols-2 gap-1">
                            {['pipe', 'socket', 'elbow', 'cheese', 'mcUnion', 'meter', 'hojoValve', 'fixedCustom', 'text'].map(t => (
                                <button key={t} onClick={() => setTool(t)} className={`p-1 text-xs rounded ${tool === t ? 'bg-green-600' : 'bg-gray-700'}`}>
                                    {BASE_NAMES[t] || t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Properties */}
                    {selectedShapeProps && (
                        <div className="bg-gray-800 p-2 rounded border border-gray-700">
                            <div className="text-xs text-indigo-300 mb-2 font-bold">プロパティ</div>
                            <div className="text-xs mb-2">ID: {selectedShapeProps.id.slice(0, 6)}</div>
                            <div className="text-xs mb-2">Type: {selectedShapeProps.type}</div>
                            {/* Add more property inputs here if needed */}
                        </div>
                    )}
                </div>

                <div className="p-2 bg-gray-800 text-xs text-gray-400 border-t border-gray-700">
                    {status}
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 bg-gray-600 relative overflow-hidden flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={800}
                    className="bg-white shadow-lg cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onWheel={handleWheel}
                />
            </div>
        </div>
    );
};

export default CanvasApp;

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import type { PathResult, Person, Relationship } from '../../types/graph';
import { hexToRgba } from '../../utils/color';

interface GraphCanvasProps {
  width: number;
  height: number;
  people: Person[];
  relationships: Relationship[];
  selectedPersonId: string | null;
  hoveredPersonId: string | null;
  discoveryPath: PathResult | null;
  searchQuery: string;
  selectedTags: string[];
  onSelectPerson: (id: string | null) => void;
  onHoverPerson: (id: string | null) => void;
  onHoverLink: (id: string | null) => void;
  onNodePositionsChange: (positions: Array<{ id: string; x?: number; y?: number; fx?: number | null; fy?: number | null }>) => void;
  graphRef: React.MutableRefObject<ForceGraphMethods | undefined>;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  width,
  height,
  people,
  relationships,
  selectedPersonId,
  hoveredPersonId,
  discoveryPath,
  searchQuery,
  selectedTags,
  onSelectPerson,
  onHoverPerson,
  onHoverLink,
  onNodePositionsChange,
  graphRef,
}) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  // Sync ref with parent
  useEffect(() => {
    graphRef.current = fgRef.current;
  }, [graphRef]);

  // Determine active path sets for fast lookup
  const pathNodeIds = useMemo(() => new Set(discoveryPath?.nodeIds || []), [discoveryPath]);
  const pathLinkIds = useMemo(() => new Set(discoveryPath?.linkIds || []), [discoveryPath]);

  // Direct neighbors of selected or hovered person
  const highlightedNodeIds = useMemo(() => {
    const activeId = hoveredPersonId || selectedPersonId;
    if (!activeId) return null;

    const set = new Set<string>([activeId]);
    for (const rel of relationships) {
      const s = typeof rel.source === 'object' ? (rel.source as any).id : rel.source;
      const t = typeof rel.target === 'object' ? (rel.target as any).id : rel.target;
      if (s === activeId) set.add(t);
      if (t === activeId) set.add(s);
    }
    return set;
  }, [hoveredPersonId, selectedPersonId, relationships]);

  // Search and Tag matching IDs
  const searchMatchingIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasTagFilter = selectedTags.length > 0;
    if (!q && !hasTagFilter) return null;

    const set = new Set<string>();
    for (const p of people) {
      const matchName = !q || p.name.toLowerCase().includes(q) || (p.nickname && p.nickname.toLowerCase().includes(q));
      const matchTag =
        !hasTagFilter || (p.tags && selectedTags.some((tag) => p.tags.includes(tag)));

      if (matchName && matchTag) {
        set.add(p.id);
      }
    }
    return set;
  }, [searchQuery, selectedTags, people]);

  // Focus on selected person or matching search if singular
  useEffect(() => {
    if (selectedPersonId && fgRef.current) {
      const person = people.find((p) => p.id === selectedPersonId);
      if (person && person.x !== undefined && person.y !== undefined) {
        fgRef.current.centerAt(person.x, person.y, 600);
      }
    }
  }, [selectedPersonId, people]);

  // Focus path if newly discovered
  useEffect(() => {
    if (discoveryPath && discoveryPath.found && fgRef.current && discoveryPath.nodes.length > 0) {
      // Fit to view
      setTimeout(() => {
        fgRef.current?.zoomToFit(500, 100);
      }, 100);
    }
  }, [discoveryPath]);

  // Build graphData for force-graph
  const graphData = useMemo(() => {
    const nodes = people.map((p) => ({
      ...p,
      // preserve fixed or initialized coordinates
      x: p.x,
      y: p.y,
      fx: p.fx,
      fy: p.fy,
    }));

    const links = relationships.map((r) => ({
      ...r,
      source: r.source,
      target: r.target,
    }));

    return { nodes, links };
  }, [people, relationships]);

  // Custom node drawing
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // Guard against non-finite node coordinates during force layout initialization
      if (
        !node ||
        typeof node.x !== 'number' ||
        typeof node.y !== 'number' ||
        !Number.isFinite(node.x) ||
        !Number.isFinite(node.y)
      ) {
        return;
      }

      const scale =
        typeof globalScale === 'number' && Number.isFinite(globalScale) && globalScale > 0
          ? globalScale
          : 1;

      const isSelected = selectedPersonId === node.id;
      const isHovered = hoveredPersonId === node.id;
      const isInPath = pathNodeIds.has(node.id);
      const isNeighbor = highlightedNodeIds ? highlightedNodeIds.has(node.id) : true;
      const isSearchMatch = searchMatchingIds ? searchMatchingIds.has(node.id) : true;

      // Base radius
      const baseRadius = 14;
      const radius = isSelected || isHovered || isInPath ? baseRadius + 3 : baseRadius;

      // Calculate dimming
      let opacity = 1;
      if (discoveryPath) {
        opacity = isInPath ? 1 : 0.2;
      } else if (highlightedNodeIds) {
        opacity = isNeighbor ? 1 : 0.22;
      } else if (searchMatchingIds) {
        opacity = isSearchMatch ? 1 : 0.22;
      }

      ctx.save();
      ctx.globalAlpha = opacity;

      // Subtle celestial outer glow
      const glowColor = isInPath
        ? '#fbbf24'
        : isSelected
        ? '#38bdf8'
        : node.avatarColor || '#38bdf8';

      // 1. Outer radial glow with verified finite radii
      const r0 = Math.max(0.1, radius * 0.7);
      const r1 = Math.max(r0 + 0.1, radius * (isInPath || isSelected ? 2.6 : 1.8));

      try {
        const glowGrad = ctx.createRadialGradient(node.x, node.y, r0, node.x, node.y, r1);
        glowGrad.addColorStop(0, hexToRgba(glowColor, isInPath || isSelected ? 0.45 : 0.2));
        glowGrad.addColorStop(1, hexToRgba(glowColor, 0));

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r1, 0, 2 * Math.PI);
        ctx.fill();
      } catch {
        // Fallback solid glow if canvas gradient throws
        ctx.fillStyle = hexToRgba(glowColor, 0.15);
        ctx.beginPath();
        ctx.arc(node.x, node.y, r1, 0, 2 * Math.PI);
        ctx.fill();
      }

      // 2. Pulse celestial ring for selected or path
      if (isSelected || isInPath) {
        ctx.strokeStyle = isInPath ? '#fbbf24' : '#38bdf8';
        ctx.lineWidth = 2.5 / scale;
        ctx.setLineDash(isInPath ? [4 / scale, 3 / scale] : []);
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4 / scale, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Node core circle (dark interior with colored border)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Node border
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = (isSelected || isInPath ? 3 : 2) / scale;
      ctx.stroke();

      // 4. Initials avatar inside core
      const nameParts = (node.name || '?').trim().split(/\s+/);
      const initials =
        nameParts.length === 1
          ? nameParts[0].substring(0, 2).toUpperCase()
          : (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();

      const fontSize = Math.max(9, Math.round(11 / scale));
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = glowColor;
      ctx.fillText(initials, node.x, node.y);

      // 5. Sequence badge if part of shortest path (e.g. #1, #2, #3)
      if (isInPath && discoveryPath) {
        const stepIndex = discoveryPath.nodeIds.indexOf(node.id);
        if (stepIndex !== -1) {
          const badgeRadius = 7 / scale;
          const badgeX = node.x + radius * 0.75;
          const badgeY = node.y - radius * 0.75;

          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.font = `bold ${Math.max(7, Math.round(8 / scale))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${stepIndex + 1}`, badgeX, badgeY);
        }
      }

      // 6. Label under node (Name + optional nickname)
      const showLabel = scale > 0.4 || isSelected || isHovered || isInPath;
      if (showLabel) {
        const label = node.nickname ? `${node.name} "${node.nickname}"` : node.name;
        const labelFontSize = Math.max(10, Math.round(12 / scale));
        ctx.font = `500 ${labelFontSize}px system-ui, -apple-system, sans-serif`;

        const textWidth = ctx.measureText(label).width;
        const textY = node.y + radius + 11 / scale;
        const pillHeight = 16 / scale;
        const pillY = textY - pillHeight / 2;

        // Label pill backdrop for crisp legibility over lines
        ctx.fillStyle = 'rgba(8, 12, 22, 0.75)';
        ctx.beginPath();
        const r = 4 / scale;
        const pillX = node.x - textWidth / 2 - 6 / scale;
        const pillW = textWidth + 12 / scale;
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(pillX, pillY, pillW, pillHeight, Math.max(0, r));
        } else {
          ctx.rect(pillX, pillY, pillW, pillHeight);
        }
        ctx.fill();

        if (isSelected || isInPath) {
          ctx.strokeStyle = isInPath ? 'rgba(251, 191, 36, 0.5)' : 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 1 / scale;
          ctx.stroke();
        }

        ctx.fillStyle = isSelected || isInPath ? '#f8fafc' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, textY);
      }

      ctx.restore();
    },
    [
      selectedPersonId,
      hoveredPersonId,
      pathNodeIds,
      highlightedNodeIds,
      searchMatchingIds,
      discoveryPath,
    ]
  );

  // Pointer area for mouse hit-test
  const paintPointerArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      if (
        !node ||
        typeof node.x !== 'number' ||
        typeof node.y !== 'number' ||
        !Number.isFinite(node.x) ||
        !Number.isFinite(node.y)
      ) {
        return;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 18, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  // Link styling
  const getLinkColor = useCallback(
    (link: any) => {
      const linkId = link.id;
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const tId = typeof link.target === 'object' ? link.target.id : link.target;

      if (pathLinkIds.has(linkId)) {
        return '#fbbf24'; // bright electric amber/gold
      }

      const activeId = hoveredPersonId || selectedPersonId;
      if (activeId && (sId === activeId || tId === activeId)) {
        return '#38bdf8'; // bright celestial cyan
      }

      if (discoveryPath) {
        return 'rgba(71, 85, 105, 0.15)'; // dimmed
      }

      if (activeId) {
        return 'rgba(71, 85, 105, 0.12)'; // dimmed non-incident edges
      }

      return 'rgba(148, 163, 184, 0.28)';
    },
    [pathLinkIds, hoveredPersonId, selectedPersonId, discoveryPath]
  );

  const getLinkWidth = useCallback(
    (link: any) => {
      const linkId = link.id;
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const tId = typeof link.target === 'object' ? link.target.id : link.target;

      if (pathLinkIds.has(linkId)) {
        return 3.5;
      }
      const activeId = hoveredPersonId || selectedPersonId;
      if (activeId && (sId === activeId || tId === activeId)) {
        return 2.4;
      }
      return 1.2;
    },
    [pathLinkIds, hoveredPersonId, selectedPersonId]
  );

  // Directional particles for discovery path & selected
  const getLinkParticles = useCallback(
    (link: any) => {
      if (pathLinkIds.has(link.id)) {
        return 4;
      }
      const activeId = hoveredPersonId || selectedPersonId;
      if (activeId) {
        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sId === activeId || tId === activeId) {
          return 2;
        }
      }
      return 0;
    },
    [pathLinkIds, hoveredPersonId, selectedPersonId]
  );

  // Handle node drag end to persist coordinates in IndexedDB
  const handleNodeDragEnd = useCallback(
    (node: any) => {
      if (
        !node ||
        typeof node.x !== 'number' ||
        typeof node.y !== 'number' ||
        !Number.isFinite(node.x) ||
        !Number.isFinite(node.y)
      ) {
        return;
      }
      // Fix node position on drag end
      node.fx = node.x;
      node.fy = node.y;

      onNodePositionsChange([
        {
          id: node.id,
          x: node.x,
          y: node.y,
          fx: node.fx,
          fy: node.fy,
        },
      ]);
    },
    [onNodePositionsChange]
  );

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#080c16]">
      {/* Background Starfield / Constellation Ambience */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.05) 0%, transparent 60%),
            radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 20% 80%, rgba(244, 63, 94, 0.04) 0%, transparent 50%)
          `,
        }}
      />

      <ForceGraph2D
        ref={fgRef as any}
        width={width}
        height={height}
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={paintPointerArea}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkDirectionalParticles={getLinkParticles}
        linkDirectionalParticleSpeed={0.007}
        linkDirectionalParticleWidth={2.8}
        linkDirectionalParticleColor={(link: any) =>
          pathLinkIds.has(link.id) ? '#fbbf24' : '#38bdf8'
        }
        linkCurvature={0.08}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={50}
        cooldownTicks={100}
        onNodeClick={(node: any) => {
          onSelectPerson(node.id === selectedPersonId ? null : node.id);
        }}
        onNodeHover={(node: any) => {
          onHoverPerson(node ? node.id : null);
        }}
        onLinkHover={(link: any) => {
          onHoverLink(link ? link.id : null);
        }}
        onBackgroundClick={() => {
          onSelectPerson(null);
        }}
        onNodeDragEnd={handleNodeDragEnd}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
    </div>
  );
};

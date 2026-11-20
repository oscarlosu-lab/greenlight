import React from 'react'
import type { StreamHudMetrics } from '../../lib/streamStats'

interface StreamFpsOverlayProps {
    metrics?: StreamHudMetrics
}

export default function StreamFpsOverlay({ metrics }: StreamFpsOverlayProps) {
    const fps = metrics ? `${metrics.fps} FPS` : '-- FPS'
    const resolution = metrics && metrics.width > 0 && metrics.height > 0
        ? `${metrics.width}x${metrics.height}`
        : '--'
    const bitrate = metrics ? `${metrics.bitrateMbps.toFixed(1)} Mbps` : '-- Mbps'
    const rtt = metrics && metrics.rttMs !== null ? `${metrics.rttMs} ms` : '-- ms'
    const loss = metrics ? `${metrics.lossPercent.toFixed(1)}%` : '--%'
    const codec = metrics?.codec || '--'

    return (
        <div
            id="component_streamcomponent_fps_overlay"
            aria-hidden="true"
            style={{
                position: 'fixed',
                top: 12,
                left: 12,
                zIndex: 45,
                pointerEvents: 'none',
                userSelect: 'none',
                background: 'rgba(12, 14, 18, 0.72)',
                color: '#e6edf3',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 6,
                padding: '6px 10px',
                fontFamily: 'Consolas, "Cascadia Mono", monospace',
                fontSize: 12,
                lineHeight: 1.4,
                letterSpacing: '0.02em',
                backdropFilter: 'blur(4px)',
                whiteSpace: 'nowrap',
            }}
        >
            <span><strong>{fps}</strong></span>
            {' · '}
            <span>{resolution}</span>
            {' · '}
            <span>{bitrate}</span>
            {' · '}
            <span>RTT {rtt}</span>
            {' · '}
            <span>Loss {loss}</span>
            {' · '}
            <span>{codec}</span>
        </div>
    )
}

import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import uPlot from 'uplot'
import type XCloudPlayer from 'xbox-xcloud-player'

const sampleIntervalMs = 1000
const historyLength = 40

const chartOptions = {
    class: 'debug-chart',
    width: 600,
    height: 230,
    scales: { x: { time: false } },
}

export default function StreamDebug({ player }: { player: XCloudPlayer }) {
    const { t } = useTranslation()
    const jitterHost = useRef<HTMLDivElement>(null)
    const dropsHost = useRef<HTMLDivElement>(null)
    const [report, setReport] = useState<RTCInboundRtpStreamStats>()

    useEffect(() => {
        const time: number[] = []
        const jitter: number[] = []
        const packets: number[] = []
        const frames: number[] = []
        const jitterData: uPlot.AlignedData = [time, jitter]
        const dropsData: uPlot.AlignedData = [time, packets, frames]

        const jitterPlot = new uPlot({
            ...chartOptions,
            title: 'Jitter (ms)',
            series: [{}, { label: 'Jitter', stroke: 'red', width: 2, fill: 'rgba(255, 0, 0, 0.3)' }],
            axes: [{}, { size: 50, stroke: 'red', values: (_, values) => values.map(value => value.toFixed(1)) }],
        }, jitterData, jitterHost.current)
        const dropsPlot = new uPlot({
            ...chartOptions,
            title: 'Packets lost / Frames dropped',
            series: [
                {},
                { label: 'Packets lost', stroke: 'green', width: 2, fill: 'rgba(0, 255, 0, 0.3)' },
                { label: 'Frames dropped', stroke: 'blue', width: 2, fill: 'rgba(0, 0, 255, 0.3)' },
            ],
            axes: [{}, { size: 50, values: (_, values) => values.map(value => value.toFixed(0)) }],
        }, dropsData, dropsHost.current)

        let previous: RTCInboundRtpStreamStats | undefined
        let previousConnection: RTCPeerConnection | undefined
        let timer: number | undefined
        let stopped = false

        async function sample() {
            try {
                const connection = player._webrtcClient
                const stats = await connection?.getStats()
                if (stopped || !stats || connection !== player._webrtcClient) return

                let video: RTCInboundRtpStreamStats | undefined
                stats.forEach(entry => {
                    if (entry.type === 'inbound-rtp' && entry.kind === 'video' &&
                        (!video || (entry.framesDecoded ?? 0) > (video.framesDecoded ?? 0))) {
                        video = entry
                    }
                })
                if (!video) return

                if (time.length === historyLength) {
                    time.shift()
                    jitter.shift()
                    packets.shift()
                    frames.shift()
                }
                const sameStream = previousConnection === connection && previous?.id === video.id
                time.push(performance.now() / 1000)
                jitter.push((video.jitter ?? 0) * 1000)
                packets.push(sameStream ? Math.max(0, (video.packetsLost ?? 0) - (previous.packetsLost ?? 0)) : 0)
                frames.push(sameStream ? Math.max(0, (video.framesDropped ?? 0) - (previous.framesDropped ?? 0)) : 0)
                previous = video
                previousConnection = connection

                jitterPlot.setData(jitterData)
                dropsPlot.setData(dropsData)
                setReport(video)
            } catch {
                // The peer connection may close between samples.
            } finally {
                if (!stopped) timer = window.setTimeout(sample, sampleIntervalMs)
            }
        }

        void sample()
        return () => {
            stopped = true
            window.clearTimeout(timer)
            jitterPlot.destroy()
            dropsPlot.destroy()
        }
    }, [player])

    return (
        <div id="component_streamcomponent_debug">
            <p>{t('streamWindow.debugTitle')}:</p>
            <div id="component_streamcomponent_debug_webrtc_jitter" ref={jitterHost} />
            <div id="component_streamcomponent_debug_webrtc_dropped" ref={dropsHost} />
            <div id="component_streamcomponent_debug_text">
                {report && Object.entries(report).map(([name, value]) => (
                    <div key={name}><strong>{name}:</strong> {String(value)}</div>
                ))}
            </div>
        </div>
    )
}

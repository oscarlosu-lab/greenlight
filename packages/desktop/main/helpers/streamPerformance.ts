import { app, powerSaveBlocker } from 'electron'
import os from 'os'
import { appendStreamPathLog } from './streamPathFile'

let holders = 0
let suspensionBlocker = -1
let displayBlocker = -1

export function acquireStreamPerformance() {
    holders++
    if (holders > 1) {
        return
    }

    if (powerSaveBlocker && typeof powerSaveBlocker.start === 'function') {
        suspensionBlocker = powerSaveBlocker.start('prevent-app-suspension')
        displayBlocker = powerSaveBlocker.start('prevent-display-sleep')
        appendStreamPathLog('stream performance mode on: app suspension and display sleep blocked')
    }

    raiseProcessPriority(process.pid, 'main')
    raiseHelperPriorities()
}

export function releaseStreamPerformance() {
    if (holders === 0) {
        return
    }
    holders--
    if (holders > 0) {
        return
    }

    if (powerSaveBlocker && typeof powerSaveBlocker.isStarted === 'function') {
        if (suspensionBlocker !== -1 && powerSaveBlocker.isStarted(suspensionBlocker)) {
            powerSaveBlocker.stop(suspensionBlocker)
        }
        if (displayBlocker !== -1 && powerSaveBlocker.isStarted(displayBlocker)) {
            powerSaveBlocker.stop(displayBlocker)
        }
    }
    suspensionBlocker = -1
    displayBlocker = -1
    appendStreamPathLog('stream performance mode off')
}

function raiseProcessPriority(pid: number, label: string) {
    const levels = [os.constants.priority.PRIORITY_HIGH, os.constants.priority.PRIORITY_ABOVE_NORMAL]
    for (const level of levels) {
        try {
            os.setPriority(pid, level)
            appendStreamPathLog(`${label} (pid ${pid}) priority raised`)
            return
        } catch {
            // Try the next less aggressive priority level.
        }
    }
}

function raiseHelperPriorities() {
    if (!app || typeof app.getAppMetrics !== 'function') {
        return
    }
    try {
        const metrics = app.getAppMetrics()
        for (const metric of metrics) {
            if (metric.pid && metric.pid !== process.pid && (metric.type === 'GPU' || metric.type === 'Tab')) {
                raiseProcessPriority(metric.pid, metric.type.toLowerCase())
            }
        }
    } catch {
        // Ignore if app metrics are unavailable (e.g., unit tests).
    }
}

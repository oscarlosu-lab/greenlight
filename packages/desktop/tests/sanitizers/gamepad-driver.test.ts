import CompactGamepadDriver from '../../renderer/lib/gamepaddriver'

describe('CompactGamepadDriver sanitizers', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
        jest.restoreAllMocks()
    })

    test('stop() cancels the 60Hz run loop and active-gamepad polling interval leaving 0 timers', () => {
        const origWindow = (global as any).window
        const origNavigator = (global as any).navigator
        const addListener = jest.fn()
        const removeListener = jest.fn()
        Object.defineProperty(global, 'window', {
            configurable: true,
            value: { addEventListener: addListener, removeEventListener: removeListener },
        })
        Object.defineProperty(global, 'navigator', {
            configurable: true,
            value: { getGamepads: jest.fn(() => []) },
        })

        const driver = new CompactGamepadDriver()
        driver.setApplication({
            getChannelProcessor: () => ({
                _inputFps: { count: jest.fn() },
                queueGamepadStates: jest.fn(),
                sendGamepadAdded: jest.fn(),
                sendGamepadRemoved: jest.fn(),
                onMessage: jest.fn(),
            }),
        } as any)

        driver.start()
        driver.run()
        expect(jest.getTimerCount()).toBeGreaterThan(0)

        driver.stop()
        expect(jest.getTimerCount()).toBe(0)
        expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function))
        expect(removeListener).toHaveBeenCalledWith('keyup', expect.any(Function))

        Object.defineProperty(global, 'window', { configurable: true, value: origWindow })
        Object.defineProperty(global, 'navigator', { configurable: true, value: origNavigator })
    })

    test('connectedGamepads() compacts empty slots, drops <4-button HIDs, and prioritizes standard controllers first', () => {
        const origNavigator = (global as any).navigator
        const fakeButtons = (n: number) => Array.from({ length: n }, () => ({ pressed: false, value: 0 }))
        Object.defineProperty(global, 'navigator', {
            configurable: true,
            value: {
                getGamepads: jest.fn(() => [
                    null,
                    { id: 'Headset HID', connected: true, mapping: '', buttons: fakeButtons(2), axes: [] },
                    { id: 'Wheel HID', connected: true, mapping: '', buttons: fakeButtons(8), axes: [0] },
                    { id: 'Xbox Wireless Controller', connected: true, mapping: 'standard', buttons: fakeButtons(17), axes: [0, 0, 0, 0] },
                ]),
            },
        })

        const driver = new CompactGamepadDriver()
        const ordered = driver.connectedGamepads()
        expect(ordered.map((g) => g.id)).toEqual(['Xbox Wireless Controller', 'Wheel HID'])

        Object.defineProperty(global, 'navigator', { configurable: true, value: origNavigator })
    })

    test('localCoopEnabled defaults to false (single controller) and announces controllers 1..3 only when enabled', () => {
        const origWindow = (global as any).window
        const origNavigator = (global as any).navigator
        const fakeButtons = (n: number) => Array.from({ length: n }, () => ({ pressed: false, value: 0 }))
        const twoPads = [
            { id: 'Pad 1', connected: true, mapping: 'standard', buttons: fakeButtons(17), axes: [0, 0, 0, 0] },
            { id: 'Pad 2', connected: true, mapping: 'standard', buttons: fakeButtons(17), axes: [0, 0, 0, 0] },
        ]

        Object.defineProperty(global, 'window', {
            configurable: true,
            value: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
        })
        Object.defineProperty(global, 'navigator', {
            configurable: true,
            value: { getGamepads: jest.fn(() => twoPads) },
        })

        const sendGamepadAdded = jest.fn()
        const sendGamepadRemoved = jest.fn()
        const mockApp: any = {
            getChannelProcessor: () => ({
                _inputFps: { count: jest.fn() },
                queueGamepadStates: jest.fn(),
                sendGamepadAdded,
                sendGamepadRemoved,
                onMessage: jest.fn(),
            }),
        }

        // Default: localCoopEnabled = false
        const singleDriver = new CompactGamepadDriver()
        singleDriver.setApplication(mockApp)
        singleDriver.start()
        jest.advanceTimersByTime(600)
        expect(sendGamepadAdded).not.toHaveBeenCalled()
        expect(singleDriver.requestStates()).toHaveLength(1)
        singleDriver.stop()

        // Opt-in: localCoopEnabled = true
        const coopDriver = new CompactGamepadDriver({ localCoopEnabled: true })
        coopDriver.setApplication(mockApp)
        coopDriver.start()
        jest.advanceTimersByTime(600)
        expect(sendGamepadAdded).toHaveBeenCalledWith(1)
        expect(coopDriver.requestStates()).toHaveLength(2)
        coopDriver.stop()

        expect(jest.getTimerCount()).toBe(0)
        Object.defineProperty(global, 'window', { configurable: true, value: origWindow })
        Object.defineProperty(global, 'navigator', { configurable: true, value: origNavigator })
    })
})

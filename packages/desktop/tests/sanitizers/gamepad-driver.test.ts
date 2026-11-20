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
})

import path from 'path'
import {
    formatInstanceWindowTitle,
    parseStartupFlags,
    resolveInstanceUserDataPath,
    validateConsoleId,
    validateProfileName,
} from '../../main/helpers/instanceProfile'

describe('Multi-instance profile isolation and consoleId validation', () => {
    it('parses valid --profile, --instance, --console, --connect, and --fullscreen flags', () => {
        const flags = parseStartupFlags([
            'Greenlight.exe',
            '--fullscreen',
            '--profile=player_2',
            '--console=F4000EE882EA7527',
            '--connect=F4000EE882EA7527',
        ])
        expect(flags).toEqual({
            fullscreen: true,
            profile: 'player_2',
            consoleId: 'F4000EE882EA7527',
            autoStream: 'F4000EE882EA7527',
        })

        expect(parseStartupFlags(['--instance=couch-coop']).profile).toBe('couch-coop')
    })

    it('rejects path traversal and unsafe characters in --profile and --console', () => {
        for (const bad of ['../evil', '..\\evil', 'a/b', 'a\\b', 'C:\\temp', 'has space', 'a'.repeat(33), '']) {
            expect(validateProfileName(bad)).toBe('')
        }
        for (const bad of ['../bad', 'id?x=1', 'id with spaces', 'id/sub', 'x'.repeat(65), '']) {
            expect(validateConsoleId(bad)).toBe('')
        }
    })

    it('isolates userData under <base>/profiles/<profile> only when a valid profile is given', () => {
        const base = path.join('C:', 'Users', 'Test', 'AppData', 'Roaming', 'greenlight')
        expect(resolveInstanceUserDataPath(base, '')).toBe(base)
        expect(resolveInstanceUserDataPath(base, '../escape')).toBe(base)
        expect(resolveInstanceUserDataPath(base, 'player2')).toBe(path.join(base, 'profiles', 'player2'))
    })

    it('formats window title cleanly with optional profile and consoleId', () => {
        expect(formatInstanceWindowTitle('', '')).toBe('Greenlight')
        expect(formatInstanceWindowTitle('player2', '')).toBe('Greenlight [player2]')
        expect(formatInstanceWindowTitle('', 'F4000EE882EA7527')).toBe('Greenlight - F4000EE882EA7527')
        expect(formatInstanceWindowTitle('player2', 'F4000EE882EA7527')).toBe('Greenlight [player2] - F4000EE882EA7527')
    })
})

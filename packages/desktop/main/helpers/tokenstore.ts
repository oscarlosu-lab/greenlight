import { safeStorage } from 'electron'
import { TokenStore } from 'xal-node'
import Store from 'electron-store'

const ENCRYPTED_PREFIX = 'enc:v1:'

export function encryptTokenPayload(plaintextJson: string): string {
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(plaintextJson)
        return ENCRYPTED_PREFIX + encrypted.toString('base64')
    }
    console.warn('AuthTokenStore: OS safeStorage encryption is unavailable; falling back to unencrypted token storage.')
    return plaintextJson
}

export function decryptTokenPayload(stored: string): string {
    if (!stored || typeof stored !== 'string') {
        return '{}'
    }
    if (stored.startsWith(ENCRYPTED_PREFIX)) {
        if (!safeStorage || typeof safeStorage.isEncryptionAvailable !== 'function' || !safeStorage.isEncryptionAvailable()) {
            throw new Error('Encrypted token payload cannot be decrypted because OS safeStorage is unavailable')
        }
        const buf = Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), 'base64')
        return safeStorage.decryptString(buf)
    }
    return stored
}

export default class AuthTokenStore extends TokenStore {

    private _store:Store

    // Share the application store: separate instances cache the file and overwrite each other's writes
    constructor(store:Store){
        super()
        this._store = store
    }

    load() {
        const raw = this._store.get('user.tokenstore', '{}') as string
        const decrypted = decryptTokenPayload(raw)
        this.loadJson(decrypted)

        // Transparently migrate legacy plaintext tokens to OS-encrypted storage (Windows DPAPI)
        if (raw !== '{}' && !raw.startsWith(ENCRYPTED_PREFIX) && safeStorage?.isEncryptionAvailable?.()) {
            this._store.set('user.tokenstore', encryptTokenPayload(decrypted))
        }

        return true
    }

    save() {
        const data = JSON.stringify({
            userToken: this._userToken?.data,
            sisuToken: this._sisuToken?.data,
            jwtKeys: this._jwtKeys,
        })

        this._store.set('user.tokenstore', encryptTokenPayload(data))
    }

    clear() {
        this._store.delete('user.tokenstore')
        this._userToken = undefined
        this._sisuToken = undefined
        this._jwtKeys = undefined
    }

    removeAll() {
        this._userToken = undefined
        this._sisuToken = undefined

        this._store.delete('user.tokenstore')
    }
}

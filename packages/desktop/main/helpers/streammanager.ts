import Application from '../application'
import xCloudApi, { playResult } from './xcloudapi'

interface streamSession {
    id: string;
    target: string;
    path: string;
    type: string|'home'|'cloud';
    state?: string;
    waitingTimes?: any;
    playerState: string|'pending'|'started'|'queued'|'failed';
    errorDetails?: {
        code;
        message;
    };
}

export default class StreamManager {

    _application:Application

    _sessions = {}
    _monitorTimeouts: Record<string, ReturnType<typeof setTimeout>> = {}
    
    constructor(application){
        this._application = application
    }

    clearMonitorTimeout(sessionId: string): void {
        const timeoutId = this._monitorTimeouts[sessionId]
        if(timeoutId !== undefined){
            clearTimeout(timeoutId)
            delete this._monitorTimeouts[sessionId]
        }
    }

    getApi(type):xCloudApi{
        if(type === 'home'){
            return this._application._xHomeApi
        } else {
            return this._application._xCloudApi
        }
    }

    getSession(sessionId:string):streamSession {
        return this._sessions[sessionId]
    }

    startStream(type:string|'home'|'cloud', target){
        return new Promise((resolve, reject) => {
            this.getApi(type).startStream(target).then((playResult:playResult) => {
            // this._application._xCloudApi.startStream(type, target).then((playResult) => {
                console.log('Streammanager - startStream:', playResult)

                const sessionId = playResult.sessionPath.split('/')[3]

                const streamSession:streamSession = {
                    id: sessionId,
                    target: target,
                    path: playResult.sessionPath,
                    type: type,
                    playerState: 'pending',
                }
                this._sessions[sessionId] = streamSession
                this.monitorSession(sessionId)

                resolve(sessionId)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    stopStream(sessionId){
        this.clearMonitorTimeout(sessionId)

        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session === undefined){
                reject('Session not found: '+sessionId)
                return
            }

            this.getApi(session.type).stopStream(sessionId).then((result) => {
                console.log('Current sessions:', this._sessions)
                delete this._sessions[sessionId]
                console.log('new sessions:', this._sessions)

                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    sendSdp(sessionId:string, sdp:any){
        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session === undefined){
                reject('Session not found: '+sessionId)
                return
            }

            this.getApi(session.type).sendSdp(sessionId, sdp).then((result) => {

                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    sendChatSdp(sessionId:string, sdp:any){
        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session === undefined){
                reject('Session not found: '+sessionId)
                return
            }

            this.getApi(session.type).sendChatSdp(sessionId, sdp).then((result) => {

                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    sendIce(sessionId:string, ice:any){
        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session === undefined){
                reject('Session not found: '+sessionId)
                return
            }

            this.getApi(session.type).sendIce(sessionId, ice).then((result) => {

                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    sendKeepalive(sessionId:string){
        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session === undefined){
                reject('Session not found: '+sessionId)
                return
            }

            this.getApi(session.type).sendKeepalive(sessionId).then((result) => {
                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    monitorSession(sessionId){
        this.clearMonitorTimeout(sessionId)

        this._monitorTimeouts[sessionId] = setTimeout(() => {
            delete this._monitorTimeouts[sessionId]
            this._application.log('StreamManager', 'monitorSession('+sessionId+') checking state')

            const session = this.getSession(sessionId)
            if(session === undefined){
                this._application.log('StreamManager', 'monitorSession('+sessionId+') session not found')
                return
            }
            this.getApi(session.type).getStreamState(sessionId).then((result:any) => {
                const currentSession = this.getSession(sessionId)
                if(currentSession === undefined){
                    return
                }
                console.log('Streammanager - state:', result)

                currentSession.state = result.state

                if(result.state === 'Provisioned'){
                    currentSession.playerState = 'started'

                } else if(result.state === 'Provisioning'){
                    // Lets loop again
                    this.monitorSession(sessionId)

                } else if(result.state === 'ReadyToConnect'){
                    // Do MSAL Auth
                    // @TODO: Refresh token if expired?
                    this._application._authentication._msal.getMsalToken().then((msalToken) => {
                        const activeSession = this.getSession(sessionId)
                        if(activeSession === undefined){
                            return
                        }
                        this.getApi(activeSession.type).sendMSALAuth(sessionId, msalToken.data.lpt).then(() => {
                            if(this.getSession(sessionId) !== undefined){
                                this.monitorSession(sessionId)
                            }

                        }).catch((error) => {
                            this._application.log('StreamManager', 'MSAL AUTH Error:', error)
                            const failedSession = this.getSession(sessionId)
                            if(failedSession !== undefined){
                                failedSession.errorDetails = {
                                    code: 'MSALAuthError',
                                    message: error instanceof Error ? error.message : String(error),
                                }
                                failedSession.playerState = 'failed'
                            }
                        })
                    }).catch((error) => {
                        this._application.log('StreamManager', 'MSAL AUTH Error:', error)
                        const failedSession = this.getSession(sessionId)
                        if(failedSession !== undefined){
                            failedSession.errorDetails = {
                                code: 'MSALAuthError',
                                message: error instanceof Error ? error.message : String(error),
                            }
                            failedSession.playerState = 'failed'
                        }
                    })

                } else if(result.state === 'WaitingForResources'){
                    // Do Queue logic
                    if(currentSession.waitingTimes === undefined){
                        this.getApi(currentSession.type).getWaitingTimes(currentSession.target).then((waitingTimes) => {
                            const activeSession = this.getSession(sessionId)
                            if(activeSession !== undefined){
                                activeSession.waitingTimes = waitingTimes
                                activeSession.playerState = 'queued'
                            }
                        }).catch((err) => {
                            this._application.log('StreamManager', 'Error getting waiting times:', err)
                        })
                    }
                    
                    this.monitorSession(sessionId)

                } else if(result.state === 'Failed'){
                    currentSession.errorDetails = result.errorDetails
                    currentSession.playerState = 'failed'

                } else {
                    
                    console.log('Unknown state:', result)
                }

            }).catch((error) => {
                console.log('Streammanager - error checking state:', sessionId, error)

                const activeSession = this.getSession(sessionId)
                if(activeSession === undefined){
                    return
                }

                if(error.status === 404){
                    this._application.log('StreamManager', 'Session not found on server. Removing session...')
                    this.clearMonitorTimeout(sessionId)
                    delete this._sessions[sessionId]
                } else {
                    this.monitorSession(sessionId)
                }
            })
        }, 1000)
    }

    getActiveSessions(){
        return new Promise((resolve, reject) => {
            this.getApi('cloud').getActiveSessions().then((result) => {

                console.log('Active sessions:', result)
                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }
}
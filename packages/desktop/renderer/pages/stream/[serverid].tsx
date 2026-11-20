import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import xCloudPlayer from 'xbox-xcloud-player'

import { useSettings } from '../../context/userContext'
import StreamComponent from '../../components/ui/streamcomponent'
import StreamPreload from '../../components/ui/streampreload'
import Ipc from '../../lib/ipc'
import { applyLowLatencyReceivers, filterIceCandidates, followConsolePicture, logIceList, logSelectedIcePath, logStreamPath, waitForLocalIce } from '../../lib/streamPath'
import { useTranslation } from 'react-i18next'

function Stream() {
    const router = useRouter()
    const { settings } = useSettings()
    const { t } = useTranslation()

    const [xPlayer, setxPlayer] = React.useState<xCloudPlayer | undefined>(undefined)
    const [sessionId, setSessionId] = React.useState('')
    const [queueTime, setQueueTime] = React.useState(0)

    const startingSessionRef = React.useRef(false)
    const streamStateIntervalRef = React.useRef<ReturnType<typeof setInterval> | undefined>(undefined)

    React.useEffect(() => {
        if (!router.query.serverid || xPlayer !== undefined) {
            return
        }

        let isMounted = true

        // Detect stream type and title / server id
        let streamType = 'home'
        let serverId = router.query.serverid as string
        if(serverId.substr(0, 6) === 'xcloud'){
            streamType = 'cloud'
            serverId = serverId.substr(7)
        }

        if(sessionId === '') {
            if(startingSessionRef.current) {
                return
            }
            startingSessionRef.current = true

            // Stream is not ready yet, lets start it...
            Ipc.send('streaming', 'startStream', {
                type: streamType,
                target: serverId,
            }).then((result:string) => {
                if(!isMounted) {
                    return
                }
                console.log('StartStream session:', result)
                setSessionId(result)

            }).catch((error) => {
                startingSessionRef.current = false
                if(!isMounted) {
                    return
                }
                alert(t('errors.failedToStartStream') + '\n' + JSON.stringify(error))
            })
            return () => {
                isMounted = false
            }
        }

        const interval = setInterval(() => {
            Ipc.send('streaming', 'getPlayerState', {
                sessionId: sessionId,
            }).then((session:any) => {
                if(!isMounted) {
                    return
                }
                console.log('Player state:', session)

                switch(session.playerState){
                    case 'pending':
                        // Waiting for console to start
                        break

                    case 'started':
                        // Console is ready
                        clearInterval(interval)
                        if(streamStateIntervalRef.current === interval) {
                            streamStateIntervalRef.current = undefined
                        }

                        // Start xPlayer interface
                        setxPlayer(new xCloudPlayer('streamComponent', {
                            ui_systemui: [],
                            input_touch: settings.input_touch || false,
                            input_mousekeyboard: settings.input_mousekeyboard || false,
                            input_legacykeyboard: (settings.input_newgamepad) ? false : true,
                            input_mousekeyboard_config: settings.input_mousekeyboard_config !== undefined ? {
                                _keymapping: settings.input_mousekeyboard_config,
                            } : undefined as any,
                        }))
                        break

                    case 'failed':
                        // Error
                        clearInterval(interval)
                        if(streamStateIntervalRef.current === interval) {
                            streamStateIntervalRef.current = undefined
                        }

                        if(session.errorDetails.code === 'WNSError' && session.errorDetails.message.includes('WaitingForServerToRegister')){
                            // Detected the "WaitingForServerToRegister" error. This means the console is not connected to the xbox servers
                            alert(t('errors.unableToStartStreamSession') + '\n\n' + t('errors.streamErrorResult') + ' ' + session.state + '\n' + t('errors.details') + ' [' + session.errorDetails.code + '] ' + session.errorDetails.message)
                        } else {
                            alert(t('errors.streamErrorResult') + ' ' + session.state + '\n' + t('errors.details') + ' [' + session.errorDetails.code + '] ' + session.errorDetails.message)
                        }
                        console.log('Full stream error:', session.errorDetails)
                        onDisconnect()
                        break

                    case 'queued':
                        // Waiting in queue
                        // @TODO: Show queue position
                        if(queueTime === 0){
                            setQueueTime(session.waitingTimes.estimatedTotalWaitTimeInSeconds)
                            console.log('Setting queue to:', session.waitingTimes.estimatedTotalWaitTimeInSeconds)
                        }
                        break
                }

            }).catch((error) => {
                if(!isMounted) {
                    return
                }
                alert(t('errors.failedToGetPlayerState') + '\n' + JSON.stringify(error))
            })
        }, 1000)

        streamStateIntervalRef.current = interval

        return () => {
            isMounted = false
            clearInterval(interval)
            if(streamStateIntervalRef.current === interval) {
                streamStateIntervalRef.current = undefined
            }
        }
    }, [router.query.serverid, sessionId, xPlayer])

    React.useEffect(() => {
        if(xPlayer === undefined){
            return
        }

        let isUnmounting = false
        const iceSignal = { cancelled: false }
        let keepaliveInterval: ReturnType<typeof setInterval> | undefined
        let pathLogInterval: ReturnType<typeof setInterval> | undefined
        let stopFollowingPicture: (() => void) | undefined

        const streamType = (typeof router.query.serverid === 'string' && router.query.serverid.substr(0, 6) === 'xcloud') ? 'cloud' : 'home'
        const holder = document.getElementById('streamComponentHolder')
        if(holder !== null){
            holder.innerHTML = '<div id="streamComponent" class="size_'+settings.video_size+'"></div>'
        }
        xPlayer.bind()

        // Set bitrates & video codec profiles
        if((streamType === 'cloud') ? settings.xcloud_bitrate : settings.xhome_bitrate > 0){
            xPlayer.setVideoBitrate((streamType === 'cloud') ? settings.xcloud_bitrate : settings.xhome_bitrate)
        }

        if(settings.video_profiles.length > 0){
            xPlayer.setCodecPreferences('video/H264', { profiles: settings.video_profiles || [] }) // 4d = high, 42e = mid, 420 = low
        }

        // Stream is ready so we start the player
        xPlayer.setControllerRumble(settings.controller_vibration)
        xPlayer.setSdpHandler((client, offer) => {
            if(isUnmounting){
                return
            }
            Ipc.send('streaming', 'sendChatSdp', {
                sessionId: sessionId,
                sdp: offer.sdp,
            }).then((sdpResponse) => {
                if(isUnmounting){
                    return
                }
                xPlayer.setRemoteOffer(sdpResponse.sdp)

            }).catch((error) => {
                if(isUnmounting){
                    return
                }
                console.log('ChatSDP Exchange error:', error)
                alert(t('errors.chatSDPExchangeError') + ' ' + JSON.stringify(error))
            })
        })

        xPlayer.createOffer().then((offer:any) => {
            if(isUnmounting){
                return
            }
            Ipc.send('streaming', 'sendSdp', {
                sessionId: sessionId,
                sdp: offer.sdp,
            }).then((sdpResult:any) => {
                if(isUnmounting){
                    return
                }
                xPlayer.setRemoteOffer(sdpResult.sdp)

                // Gather candidates (wait for full ICE gathering and prefer UDP on LAN with TCP fallback)
                waitForLocalIce(xPlayer._webrtcClient, () => xPlayer.getIceCandidates(), 4000, iceSignal).then((iceCandidates) => {
                    if(isUnmounting){
                        return
                    }
                    const { candidates, skippedTcp, usedTcpFallback } = filterIceCandidates(iceCandidates)
                    if(skippedTcp > 0){
                        logStreamPath(`skipped ${skippedTcp} tcp candidates so the stream stays on udp`)
                    } else if(usedTcpFallback){
                        logStreamPath(`no udp candidates available; falling back to ${candidates.length} tcp candidates`)
                    }

                    Ipc.send('streaming', 'sendIce', {
                        sessionId: sessionId,
                        ice: candidates,
                    }).then((iceResult:any) => {
                        if(isUnmounting){
                            return
                        }
                        logIceList('remote', iceResult || [])
                        xPlayer.setIceCandidates(iceResult)

                        // All done. Waiting for the event 'connectionstate' to be triggered

                    }).catch((error) => {
                        if(isUnmounting){
                            return
                        }
                        console.log('ICE Exchange error:', error)
                        alert(t('errors.ICEExchangeError') + ' ' + JSON.stringify(error))
                    })
                })

            }).catch((error) => {
                if(isUnmounting){
                    return
                }
                console.log('SDP Exchange error:', error)
                alert(t('errors.SDPExchangeError') + ' ' + JSON.stringify(error))
            })
        }).catch((error) => {
            if(isUnmounting){
                return
            }
            console.log('CreateOffer error:', error)
        })

        const connectionStateHandler = (event) => {
            if(isUnmounting){
                return
            }
            console.log('connectionstate changed:', event)

            const connStatus = document.getElementById('component_streamcomponent_connectionstatus')
            if(connStatus !== null){
                if(event.state === 'connected'){
                    connStatus.innerText = t('streamWindow.clientHasBeenDisconnected')
                    const loader = document.getElementById('component_streamcomponent_loader')
                    if(loader !== null){
                        loader.className = 'hidden'
                    }

                    // Set audio / Video settings
                    // @TODO: Implement api's in xbox-xcloud-player
                    if(settings.audio_enabled === false && xPlayer._audioComponent?._audioRender){
                        xPlayer._audioComponent._audioRender.muted = true
                    }

                    if(settings.video_enabled === false && xPlayer._videoComponent?._videoRender){
                        xPlayer._videoComponent._videoRender.style.opacity = 0
                    }

                    // Apply low-latency WebRTC receiver hints (jitterBufferTarget=0 / playoutDelayHint=0) and log ICE path
                    applyLowLatencyReceivers(xPlayer._webrtcClient)
                    logSelectedIcePath(xPlayer._webrtcClient).catch(() => {})
                    if(pathLogInterval !== undefined){
                        clearInterval(pathLogInterval)
                    }
                    pathLogInterval = setInterval(() => {
                        applyLowLatencyReceivers(xPlayer._webrtcClient, true)
                        logSelectedIcePath(xPlayer._webrtcClient).catch(() => {})
                    }, 15000)

                    if(streamType === 'home' && stopFollowingPicture === undefined){
                        stopFollowingPicture = followConsolePicture(xPlayer)
                    }

                    // Start keepalive loop
                    if(keepaliveInterval !== undefined){
                        clearInterval(keepaliveInterval)
                    }
                    keepaliveInterval = setInterval(() => {
                        Ipc.send('streaming', 'sendKeepalive', {
                            sessionId: sessionId,
                        }).then((result) => {
                            console.log('StartStream keepalive:', result)
                        }).catch((error) => {
                            console.error('Failed to send keepalive. Error details:\n'+JSON.stringify(error))
                        })
                    }, 30000) // Send every 30 seconds

                } else if(event.state === 'new'){
                    connStatus.innerText = t('streamWindow.startingConnection')

                } else if(event.state === 'connecting'){
                    connStatus.innerText = t('streamWindow.connectingToConsole')

                } else if(event.state === 'closed') {
                    // Client has been disconnected. Clean up timers and end the session on the server before returning home.
                    if(keepaliveInterval !== undefined){
                        clearInterval(keepaliveInterval)
                        keepaliveInterval = undefined
                    }
                    if(pathLogInterval !== undefined){
                        clearInterval(pathLogInterval)
                        pathLogInterval = undefined
                    }
                    if(stopFollowingPicture !== undefined){
                        stopFollowingPicture()
                        stopFollowingPicture = undefined
                    }
                    if(!isUnmounting){
                        console.log('Client has been disconnected. Returning to prev page.')
                        onDisconnect()
                        window.history.back()
                    }
                }
            }
        }

        xPlayer.getEventBus().on('connectionstate', connectionStateHandler)

        // Modal window
        return () => {
            isUnmounting = true
            iceSignal.cancelled = true
            xPlayer.getEventBus().removeListener?.('connectionstate', connectionStateHandler)

            if(keepaliveInterval !== undefined){
                clearInterval(keepaliveInterval)
                keepaliveInterval = undefined
            }
            if(pathLogInterval !== undefined){
                clearInterval(pathLogInterval)
                pathLogInterval = undefined
            }
            if(stopFollowingPicture !== undefined){
                stopFollowingPicture()
                stopFollowingPicture = undefined
            }

            xPlayer.close()
        }
    }, [xPlayer])

    function gamepadSend(button){
        console.log('Pressed button:', button)
        xPlayer?.getChannelProcessor('input')?.pressButton(0, 'Nexus')
    }

    function onDisconnect(){
        if(sessionId !== ''){
            Ipc.send('streaming', 'stopStream', {
                sessionId: sessionId,
            }).then((result) => {
                console.log('Stream stopped:', result)
            }).catch((error) => {
                console.log('Failed to stop stream:', error)
            })
        }

        if(streamStateIntervalRef.current !== undefined){
            clearInterval(streamStateIntervalRef.current)
            streamStateIntervalRef.current = undefined
        }
    }

    return (
        <React.Fragment>
            <Head>
                <title>Greenlight - {t('streamWindow.pageTitle')} {router.query.serverid}</title>
            </Head>

            { (xPlayer !== undefined) ? <StreamComponent onDisconnect={ () => {
                onDisconnect()
            }} onMenu={ () => {
                gamepadSend('nexus')
            } } xPlayer={ xPlayer }></StreamComponent> : (queueTime > 0) ?<StreamPreload onDisconnect={ () => {
                onDisconnect()
            }} waitingTime={ queueTime }></StreamPreload> : <StreamPreload onDisconnect={ () => {
                onDisconnect()
            }}></StreamPreload> }
        </React.Fragment>
    )
}

export default Stream

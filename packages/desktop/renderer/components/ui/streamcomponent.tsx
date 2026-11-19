import React from 'react'
import Button from './button'
import Slider from './slider'
import xPlayer from 'xbox-xcloud-player'
import Loader from './loader'
import Card from './card'
import StreamDebug from './stream-debug'
import Ipc from '../../lib/ipc'
import { useTranslation } from 'react-i18next'

interface StreamComponentProps {
    onDisconnect?: () => void;
    onMenu?: () => void;
    xPlayer: xPlayer;
}

function StreamComponent({
    onDisconnect,
    onMenu,
    xPlayer,
}: StreamComponentProps) {
    const { t } = useTranslation()

    const [micStatus, setMicStatus] = React.useState(false)
    const [waitingSeconds, setWaitingSeconds] = React.useState(0)
    const [debugVisible, setDebugVisible] = React.useState(false)
    const waitingIntervalRef = React.useRef<ReturnType<typeof setInterval> | undefined>(undefined)
    const isMountedRef = React.useRef(true)



    //Client-side volume control
    const [volume, setVolume] = React.useState(1.0) //without any controls, the volume has been maxed by default, let's follow this assumption and start at full for our slider
    const handleVolumeChange = (newVolume: number) => {

        const audioElement = document.getElementsByTagName('audio')[0]

        if(audioElement) {
            setVolume(newVolume)
            audioElement.volume = newVolume
        } else {
            console.error('VolumeSlider: handleChange: failed to find current or lost previous audioelement. Current element:', audioElement)
        }

    }
    const volumeIcon = ( //from https://www.svgrepo.com/svg/502904/volume-low and optimized w/ https://jakearchibald.github.io/svgomg/
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 14v-4a1 1 0 0 1 1-1h2.65a1 1 0 0 0 .624-.22l3.101-2.48A1 1 0 0 1 16 7.08v9.84a1 1 0 0 1-1.625.78l-3.101-2.48a1 1 0 0 0-.625-.22H8a1 1 0 0 1-1-1Z" /></svg>
    )


    React.useEffect(() => {
        isMountedRef.current = true

        const onQueueListener = Ipc.onAction('streaming', 'onQueue', (event, waitingTimes) => {
            console.log('Waiting times:', waitingTimes)
            drawWaitingTimes(waitingTimes.estimatedTotalWaitTimeInSeconds)
        })

        // ipcRenderer.on('xcloud', (event, args) => {
        //   console.log('GOT EVENT:', event, args)

        //   if(args.type === 'waitingtimes'){
        //     // Render countdown
        //     console.log('Seconds waiting time:', args.data.estimatedTotalWaitTimeInSeconds)
        //     // setWaitingTimes(args.data)
        //     drawWaitingTimes(args.data.estimatedTotalWaitTimeInSeconds)
        //   }
        // })

        // Gamebar menu mouse events
        let lastMovement = 0
        const mouseEvent = () => {
            lastMovement = Date.now()
        }
        window.addEventListener('mousemove', mouseEvent)
        window.addEventListener('mousedown', mouseEvent)

        const mouseInterval = setInterval(() => {
            const gamebarElement = document.getElementById('component_streamcomponent_gamebar')
            if (gamebarElement === null) {
                return
            }

            if ((Date.now() - lastMovement) >= 2000) {
                if (!gamebarElement.className.includes('hidden')) {
                    gamebarElement.className = 'hidden'
                }

            } else {
                if (gamebarElement.className.includes('hidden')) {
                    gamebarElement.className = ''
                }
            }
        }, 100)

        // Keyboard events
        const keyboardPressEvent = (e) => {
            switch (e.keyCode) {
                case 126:
                    toggleDebug()
                    break
            }
        }
        window.addEventListener('keypress', keyboardPressEvent)

        // cleanup this component
        return () => {
            isMountedRef.current = false
            window.removeEventListener('mousemove', mouseEvent)
            window.removeEventListener('mousedown', mouseEvent)
            window.removeEventListener('keypress', keyboardPressEvent)
            clearInterval(mouseInterval)
            Ipc.removeListener('streaming', onQueueListener)

            if (waitingIntervalRef.current !== undefined) {
                clearInterval(waitingIntervalRef.current)
                waitingIntervalRef.current = undefined
            }
        }
    }, [])



    function toggleMic() {
        if (xPlayer.getChannelProcessor('chat').isPaused === true) {
            xPlayer.getChannelProcessor('chat').startMic()
            setMicStatus(true)
        } else {
            xPlayer.getChannelProcessor('chat').stopMic()
            setMicStatus(false)
        }
    }

    function streamDisconnect() {
        const holder = document.getElementById('streamComponentHolder')
        if (holder !== null) {
            holder.innerHTML = ''
        }

        xPlayer.close()
    }

    function endStream() {
        if (confirm(t("streamWindow.endStreamConfirmMessage"))) {
            const holder = document.getElementById('streamComponentHolder')
            if (holder !== null) {
                holder.innerHTML = ''
            }
            onDisconnect?.()
            xPlayer.close()
        }
    }

    function toggleDebug() {
        setDebugVisible(visible => !visible)
    }

    function drawWaitingTimes(seconds) {
        if (waitingIntervalRef.current !== undefined) {
            clearInterval(waitingIntervalRef.current)
            waitingIntervalRef.current = undefined
        }

        if (seconds !== false) {
            let remainingSeconds = Math.max(0, Number(seconds) || 0)
            setWaitingSeconds(remainingSeconds)

            const formattedWaitingTime = formatWaitingTime(remainingSeconds)
            const html = '<div>' + t("streamWindow.estimatedWaitingTimeMessage") + ' ' + '<span id="component_streamcomponent_waitingtimes_seconds">' + formattedWaitingTime + '</span></div>'

            const waitingTimesElement = document.getElementById('component_streamcomponent_waitingtimes')
            if (waitingTimesElement !== null) {
                waitingTimesElement.innerHTML = html
            }

            if (remainingSeconds <= 0) {
                return
            }

            const secondsInterval = setInterval(() => {
                remainingSeconds = Math.max(0, remainingSeconds - 1)
                setWaitingSeconds(remainingSeconds)

                const waitingContainer = document.getElementById('component_streamcomponent_waitingtimes')
                const waitingSecondsEl = document.getElementById('component_streamcomponent_waitingtimes_seconds')
                if (waitingContainer !== null && waitingSecondsEl !== null) {
                    waitingSecondsEl.innerText = formatWaitingTime(remainingSeconds)
                } else {
                    clearInterval(secondsInterval)
                    if (waitingIntervalRef.current === secondsInterval) {
                        waitingIntervalRef.current = undefined
                    }
                }

                if (remainingSeconds <= 0) {
                    clearInterval(secondsInterval)
                    if (waitingIntervalRef.current === secondsInterval) {
                        waitingIntervalRef.current = undefined
                    }
                }
            }, 1000)

            waitingIntervalRef.current = secondsInterval
        }
    }

    function formatWaitingTime(rawSeconds: number): string {
        let formattedText = ''

        const hours = Math.floor(rawSeconds / 3600)
        const minutes = Math.floor((rawSeconds % 3600) / 60)
        const seconds = (rawSeconds % 3600) % 60

        if (hours > 0) {
            formattedText += hours + ' ' + t("streamWindow.timeHours") + ', '
        }

        if (minutes > 0) {
            formattedText += minutes + ' ' + t("streamWindow.timeMinutes") + ', '
        }

        if (seconds > 0) {
            formattedText += seconds + ' ' + t("streamWindow.timeSeconds") + '.'
        }

        return formattedText
    }

    return (
        <React.Fragment>
            <div>
                <div id="streamComponentHolder">
                </div>

                <div id="component_streamcomponent_loader">
                    <Card className='padbottom'>
                        <h1>{t("streamWindow.loadingStreamTitle")}</h1>

                        <Loader></Loader>

                        <p>{t("streamWindow.gettingStreamReadyMessage")}</p>
                        <p id="component_streamcomponent_connectionstatus"></p>

                        <p id="component_streamcomponent_waitingtimes"></p>
                    </Card>
                </div>

                <div id="component_streamcomponent_gamebar">
                    <div id="component_streamcomponent_gamebar_menu">
                        <div style={{
                            width: '25%',
                        }}>
                            <Button label={<span><i className="fa-solid fa-xmark"></i> {t("streamWindow.endStreamBtn")}</span>} title={t("streamWindow.endStreamBtn")} className='btn-cancel' onClick={() => {
                                endStream()
                            }}></Button> &nbsp;
                            <Button label={<span><i className="fa-solid fa-xmark"></i></span>} title={t("streamWindow.disconnectBtn")} className='btn' onClick={() => {
                                streamDisconnect()
                            }}></Button>
                        </div>

                        <div style={{
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}>
                            <Button label={<span><i className="fa-brands fa-xbox"></i> {t("streamWindow.menuBtn")}</span>} title={t("streamWindow.menuTitle")} onClick={(e) => {
                                e.target.blur(); onMenu?.()
                            }}></Button> &nbsp;
                            <Button label={(micStatus === false) ? <span><i className="fa-solid fa-microphone-slash"></i> {t("streamWindow.micMuted")}</span> : <span><i className="fa-solid fa-microphone"></i> {t("streamWindow.micActive")}</span>} title={(micStatus === false) ? t("streamWindow.enableMic") : t("streamWindow.disableMic")} className={(micStatus === false) ? 'btn-cancel' : 'btn-primary'} onClick={(e) => {
                                e.target.blur(); toggleMic()
                            }}></Button>
                        </div>

                        <Slider
                            id="volume-slider"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={handleVolumeChange}
                            label="Volume"
                            svg={volumeIcon}
                        />

                        <div style={{
                            marginRight: 20,
                            width: '25%',
                            textAlign: 'right',
                        }}>
                            <Button label={<i className="fa-solid fa-bug"></i>} title={t("streamWindow.debugTitle")} onClick={(e) => {
                                e.target.blur(); toggleDebug()
                            }}></Button>
                        </div>
                    </div>
                </div>

                {debugVisible && <StreamDebug player={xPlayer} />}
            </div>
        </React.Fragment>
    )
}

export default StreamComponent

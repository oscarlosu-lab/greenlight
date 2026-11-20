import '../styles.css'

import React from 'react'
import Head from 'next/head'
import Ipc from '../lib/ipc'
import { useRouter } from 'next/navigation'
import Header from '../components/header'
import Footer from '../components/footer'
import Auth from '../components/auth'
import SidebarFriends from '../components/sidebar/friends'
import '../lib/i18n'

import { UserProvider } from '../context/userContext'
import { LanguageProvider } from '../context/languageContext'

import {
    QueryClient,
    QueryClientProvider,
} from 'react-query'


// This default export is required in a new `pages/_app.js` file.
export default function MyApp({ Component, pageProps }) {
    const router = useRouter()
    const [queryClient] = React.useState(() => new QueryClient())

    const [loggedIn, setLoginState] = React.useState(false)
    const [prevUserState, setPrevUserState] = React.useState({
        signedIn: false,
        gamertag: '',
        gamerpic: '',
        gamerscore: '',
        level: '',
    })
    // const [headerLinks, setHeaderLinks] = React.useState([])
    // const [streamingMode, setStreamingMode] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    React.useEffect(() => {
        let isMounted = true
        let autoStreamTimeout: ReturnType<typeof setTimeout> | undefined

        Ipc.send('app', 'loadCachedUser').then((user) => {
            if (!isMounted) {
                return
            }
            setPrevUserState({
                signedIn: user.signedIn,
                gamertag: user.gamertag,
                gamerpic: user.gamerpic,
                gamerscore: user.gamerscore,
                level: user.level,
            })
        }).catch(() => {
            // Ignore startup cache read errors
        })

        const authInterval = setInterval(() => {
            console.log('Requesting AuthState...')
            Ipc.send('app', 'getAuthState').then((args) => {
                if (!isMounted) {
                    return
                }
                console.log('Received AuthState:', args)

                if(args.isAuthenticating === true){
                    setIsLoading(true)
                    setPrevUserState((prev) => ({ ...prev, ...args.user}))

                } else if(args.isAuthenticated === true && args.user.signedIn === true){
                    clearInterval(authInterval)

                    // After successful authentication, load and apply language setting
                    Ipc.send('settings', 'getSettings').then(settings => {
                        if (!isMounted) {
                            return
                        }
                        if (settings.language) {
                            const i18n = require('../lib/i18n').default;
                            i18n.changeLanguage(settings.language);
                        }
                    }).catch(() => {
                        // Ignore settings read errors
                    });

                    if(loggedIn === false){
                        Ipc.send('app', 'onUiShown').then((result) => {
                            if (!isMounted) {
                                return
                            }
                            if(result.autoStream !== '')
                                autoStreamTimeout = setTimeout(() => {
                                    router.push('stream/'+result.autoStream)
                                }, 1000)
                        }).catch(() => {
                            // Ignore onUiShown errors
                        })
                    }

                    setLoginState(true)
                    setPrevUserState((prev) => ({ ...prev, ...args.user}))
                }
            }).catch(() => {
                // Ignore auth polling errors
            })
        }, 500)

        const errorHandler = function(event) {
            console.error('Unhandled rejection (promise: ', event.promise, ', reason: ', event.reason, ').')
            if(event.reason && event.reason.status){
                alert('HTTP Status: ' + event.reason.status + '\nPath:' + event.reason.url + '\n' + event.reason.body)
            } else {
                alert(event.reason)
            }
        }
        window.addEventListener('unhandledrejection', errorHandler)

        // cleanup this component
        return () => {
            isMounted = false
            window.removeEventListener('unhandledrejection', errorHandler)

            if(autoStreamTimeout !== undefined)
                clearTimeout(autoStreamTimeout)

            if(authInterval)
                clearInterval(authInterval)
        }
    }, [])

    // function isStreaming(){
    //     return streamingMode
    // }

    let appBody
    if(loggedIn && prevUserState.gamertag !== ''){
        appBody = (
            <React.Fragment>
                <Header gamertag={ prevUserState.gamertag } level={ parseInt(prevUserState.level) } />

                <div id="app_body">
                    <div id="app_body_container">
                        <Component {...pageProps} />
                    </div>
                </div>

                <div id="app_sidebar" style={{
                    display: 'block',
                }}>
                    <SidebarFriends></SidebarFriends>
                </div>
                <Footer />
            </React.Fragment>)

    } else {
        appBody = (
            <React.Fragment>
                <Auth signedIn={ prevUserState.signedIn} gamertag={ prevUserState.gamertag } gamerpic={ prevUserState.gamerpic } gamerscore={ prevUserState.gamerscore } isLoading={ isLoading } />
            </React.Fragment>)
    }

    return (
        <React.Fragment>
            <Head>
                <title>Greenlight</title>
            </Head>

            <div style={ {
                background: 'linear-gradient(0deg, rgba(26,27,30,1) 0%, rgba(26,27,30,1) 25%, rgba(0,212,255,0) 100%), url(\'/images/backgrounds/background1.jpeg\') fixed',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100vw',
                height: '100vh',
            }}>
                <QueryClientProvider client={queryClient}>
                    <LanguageProvider>
                        <UserProvider>
                            {appBody}
                        </UserProvider>
                    </LanguageProvider>
                </QueryClientProvider>
            </div>
        </React.Fragment>
    )
}
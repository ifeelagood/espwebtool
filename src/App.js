import React, { useEffect } from 'react'

import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import Header from './components/Header'
import Home from './components/Home'
import ReleaseList from './components/ReleaseList'
import Output from './components/Output'
import Buttons from './components/Buttons'
import Settings from './components/Settings'
import ConfirmWindow from './components/ConfirmWindow'
import Footer from './components/Footer'

import { connectESP, supported } from './lib/esp'
import { loadSettings, defaultSettings } from './lib/settings'

const RELEASES_API_URL = 'https://monocure3d.github.io/autofill-firmware-release/'

const OFFSETS = {
    'firmware.bin': '0x10000',
    'partitions.bin': '0x8000',
    'assets.bin': '0x3FF000',
}

const App = () => {
    const [connected, setConnected] = React.useState(false) // Connection status
    const [connecting, setConnecting] = React.useState(false)
    const [output, setOutput] = React.useState({ time: new Date(), value: 'Click Connect to start\n' }) // Serial output
    const [espStub, setEspStub] = React.useState(undefined) // ESP flasher stuff
    const [uploads, setUploads] = React.useState([]) // Files of the selected release
    const [settingsOpen, setSettingsOpen] = React.useState(false) // Settings Window
    const [settings, setSettings] = React.useState({ ...defaultSettings }) // Settings
    const [confirmProgram, setConfirmProgram] = React.useState(false) // Confirm Flash Window
    const [flashing, setFlashing] = React.useState(false) // Enable/Disable buttons
    const [releases, setReleases] = React.useState([])
    const [selectedReleaseId, setSelectedReleaseId] = React.useState('')
    const [loadingReleases, setLoadingReleases] = React.useState(false)

    useEffect(() => {
        setSettings(loadSettings())
    }, [])

    // Add new message to output
    const addOutput = (msg) => {
        setOutput({
            time: new Date(),
            value: `${msg}\n`,
        })
    }

    const selectRelease = (releaseId, releaseList = releases) => {
        setSelectedReleaseId(releaseId)

        const release = releaseList.find((item) => String(item.id) === String(releaseId))
        if (!release) {
            setUploads([])
            return
        }

        setUploads(
            release.assets.map((asset) => ({
                fileName: asset.name,
                offset: OFFSETS[asset.name],
                obj: asset.browser_download_url,
            })),
        )
    }

    const fetchReleases = async () => {
        setLoadingReleases(true)

        try {
            const response = await fetch(RELEASES_API_URL)

            if (!response.ok) {
                throw new Error(`Failed to fetch releases: ${response.status}`)
            }

            const doc = new DOMParser().parseFromString(await response.text(), 'text/html')

            const data = Array.from(doc.querySelectorAll('a'))
                .map((a) => a.getAttribute('href') || '')
                .filter((href) => href && href !== '../')
                .map((href) => href.replace(/\/+$/, ''))
                .map((tag) => ({
                    id: tag,
                    tag_name: tag,
                    name: tag,
                    assets: Object.keys(OFFSETS).map((fileName) => ({
                        name: fileName,
                        browser_download_url: `${RELEASES_API_URL}${tag}/${fileName}`,
                    })),
                }))

            setReleases(data)

            if (data.length > 0) {
                const release = data.reduce((a, b) => (String(b.id) > String(a.id) ? b : a))
                selectRelease(String(release.id), data)
            } else {
                setSelectedReleaseId('')
                setUploads([])
            }
        } catch (err) {
            addOutput(`${err}`)
            toast.error(`${err}`, { position: 'top-center', autoClose: 3000 })
        } finally {
            setLoadingReleases(false)
        }
    }

    const disconnect = async () => {
        if (espStub) {
            await espStub.transport.disconnect()
            setConnected(false)
            setEspStub(undefined)
        }
    }

    // Connect to ESP & init flasher stuff
    const clickConnect = async () => {
        let esploader

        try {
            toast.info('Connecting...', {
                position: 'top-center',
                autoClose: false,
                toastId: 'connecting',
            })

            esploader = await connectESP({
                baudRate: parseInt(settings.baudRate),
                terminal: {
                    clean: () => addOutput(''),
                    writeLine: (data) => addOutput(data),
                    write: () => {},
                },
            })

            setConnecting(true)

            // main() connects, prints chip info/MAC and uploads+runs the stub itself
            const chipDescription = await esploader.main()

            addOutput(`Connected to ${chipDescription}`)

            setConnected(true)
            toast.update('connecting', {
                render: 'Connected 🚀',
                type: toast.TYPE.SUCCESS,
                autoClose: 3000,
            })

            esploader.transport.setDeviceLostCallback(() => {
                setConnected(false)
                setEspStub(undefined)
                toast.warning('Disconnected 💔', { position: 'top-center', autoClose: 3000, toastId: 'settings' })
                addOutput(`------------------------------------------------------------`)
            })

            setEspStub(esploader)
            await fetchReleases()
        } catch (err) {
            // The browser port chooser was dismissed, so there is no connection to clean up
            const cancelled = err?.name === 'NotFoundError'
            const shortErrMsg = cancelled ? 'No port selected' : `${err}`.replace('Error: ', '')

            toast.update('connecting', {
                render: shortErrMsg,
                type: cancelled ? toast.TYPE.INFO : toast.TYPE.ERROR,
                autoClose: 3000,
            })

            addOutput(shortErrMsg)

            if (esploader) {
                try {
                    await esploader.transport.disconnect()
                } catch (closeErr) {
                    console.debug(closeErr)
                }
            }
        } finally {
            setConnecting(false)
        }
    }

    // Flash Firmware
    const program = async () => {
        setConfirmProgram(false)

        const files = uploads.filter((file) => file.fileName && file.obj)

        if (files.length === 0) {
            addOutput(`Please select a release`)
            toast.info('Please select a release', { position: 'top-center', toastId: 'uploaded', autoClose: 3000 })
            return
        }

        setFlashing(true)
        toast(`Downloading ${selectedReleaseId}...`, {
            position: 'top-center',
            progress: 0,
            toastId: 'upload',
        })

        try {
            const fileArray = []

            for (const file of files) {
                const response = await fetch(file.obj)

                if (!response.ok) {
                    throw new Error(`Failed to download ${file.obj}`)
                }

                fileArray.push({
                    data: new Uint8Array(await response.arrayBuffer()),
                    address: parseInt(file.offset, 16),
                })
            }

            await espStub.writeFlash({
                fileArray: fileArray,
                flashMode: 'keep',
                flashFreq: 'keep',
                flashSize: 'keep',
                eraseAll: false,
                compress: true,
                reportProgress: (fileIndex, written, total) => {
                    const progress = written / total

                    toast.update('upload', { render: `Uploading ${files[fileIndex].fileName}...`, progress: progress })

                    addOutput(`Flashing ${files[fileIndex].fileName}... ${Math.floor(progress * 100)}%`)
                },
            })

            addOutput(`Done!`)
            addOutput(`To run the new firmware please reset your device.`)

            toast.success('Done! Reset ESP to run new firmware.', {
                position: 'top-center',
                toastId: 'uploaded',
                autoClose: 3000,
            })
        } catch (e) {
            addOutput(`ERROR!`)
            addOutput(`${e}`)
            console.error(e)
            toast.update('upload', { render: `ERROR! ${e}`, type: toast.TYPE.ERROR, autoClose: 5000 })
        } finally {
            setFlashing(false)
        }
    }

    return (
        <Box sx={{ minWidth: '25rem' }}>
            <Header sx={{ mb: '1rem' }} />

            <Grid
                container
                spacing={1}
                direction='column'
                justifyContent='space-around'
                alignItems='center'
                sx={{ minHeight: 'calc(100vh - 116px)' }}
            >
                {/* Home Page */}
                {!connected && !connecting && (
                    <Grid item>
                        <Home connect={clickConnect} supported={supported} openSettings={() => setSettingsOpen(true)} />
                    </Grid>
                )}

                {/* Home Page */}
                {!connected && connecting && (
                    <Grid item>
                        <Typography variant='h3' component='h2' sx={{ color: '#aaa' }}>
                            Connecting...
                        </Typography>
                    </Grid>
                )}

                {/* Release select + Disconnect/Upload Buttons */}
                {connected && (
                    <Grid item>
                        <ReleaseList
                            releases={releases}
                            selectedReleaseId={selectedReleaseId}
                            setSelectedReleaseId={selectRelease}
                            loading={loadingReleases}
                        />
                        <Buttons
                            disconnect={disconnect}
                            program={() => setConfirmProgram(true)}
                            disabled={flashing || loadingReleases}
                        />
                    </Grid>
                )}

                {/* Serial Output */}
                {supported() && (
                    <Grid item>
                        <Output received={output} />
                    </Grid>
                )}
            </Grid>

            {/* Settings Window */}
            <Settings
                open={settingsOpen}
                close={() => setSettingsOpen(false)}
                setSettings={setSettings}
                settings={settings}
                connected={connected}
            />

            {/* Confirm Flash/Program Window */}
            <ConfirmWindow
                open={confirmProgram}
                text={'Flashing new firmware will override the current firmware.'}
                onOk={program}
                onCancel={() => setConfirmProgram(false)}
            />

            {/* Toaster */}
            <ToastContainer />

            {/* Footer */}
            <Footer sx={{ mt: 'auto' }} />
        </Box>
    )
}

export default App

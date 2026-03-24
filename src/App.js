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

import { connectESP, formatMacAddr, sleep, supported } from './lib/esp'
import { loadSettings, defaultSettings } from './lib/settings'

const RELEASES_API_URL = 'https://monocure3d.github.io/autofill-firmware-release/';

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
  const [uploads, setUploads] = React.useState([]) // Uploaded Files
  const [settingsOpen, setSettingsOpen] = React.useState(false) // Settings Window
  const [settings, setSettings] = React.useState({...defaultSettings}) // Settings
  const [confirmErase, setConfirmErase] = React.useState(false) // Confirm Erase Window
  const [confirmProgram, setConfirmProgram] = React.useState(false) // Confirm Flash Window
  const [flashing, setFlashing] = React.useState(false) // Enable/Disable buttons
  //const [chipName, setChipName] = React.useState('') // ESP8266 or ESP32
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

  const fetchReleases = async () => {
    setLoadingReleases(true)

    try {
      const response = await fetch(RELEASES_API_URL)

      if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.status}`)
      }

      const html = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

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
        const release = data[0]
        setSelectedReleaseId(String(release.id))
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

  const selectRelease = (releaseId, releaseList = releases) => {
    setSelectedReleaseId(releaseId)

    const release = releaseList.find((item) => String(item.id) === String(releaseId))
    if (!release) {
      setUploads([])
      return
    }

    const nextUploads = Object.keys(OFFSETS)
      .map((fileName) => {
        const asset = release.assets.find((item) => item.name === fileName)

        if (!asset) {
          return null
        }

        return {
          fileName,
          offset: OFFSETS[fileName],
          obj: asset.browser_download_url,
        }
      })
      .filter(Boolean)

    setUploads(nextUploads)
  }

  // Connect to ESP & init flasher stuff
  const clickConnect = async () => {
    if (espStub) {
      await espStub.disconnect()
      await espStub.port.close()
      setEspStub(undefined)
      return
    }

    const esploader = await connectESP({
      log: (...args) => addOutput(`${args[0]}`),
      debug: (...args) => console.debug(...args),
      error: (...args) => console.error(...args),
      baudRate: parseInt(settings.baudRate),
    })

    try {
      toast.info('Connecting...', { 
        position: 'top-center', 
        autoClose: false, 
        toastId: 'connecting' 
      })
      toast.update('connecting', {
        render: 'Connecting...',
        type: toast.TYPE.INFO,
        autoClose: false
      })

      setConnecting(true)

      await esploader.initialize()

      addOutput(`Connected to ${esploader.chipName}`)
      addOutput(`MAC Address: ${formatMacAddr(esploader.macAddr())}`)

      const newEspStub = await esploader.runStub()

      setConnected(true)
      toast.update('connecting', {
        render: 'Connected 🚀',
        type: toast.TYPE.SUCCESS,
        autoClose: 3000
      })

      newEspStub.port.addEventListener('disconnect', () => {
        setConnected(false)
        setEspStub(undefined)
        toast.warning('Disconnected 💔', { position: 'top-center', autoClose: 3000, toastId: 'settings' })
        addOutput(`------------------------------------------------------------`)
      })

      setEspStub(newEspStub)
      //setChipName(esploader.chipName)
      await fetchReleases()
    } catch (err) {
      const shortErrMsg = `${err}`.replace('Error: ','')

      toast.update('connecting', {
        render: shortErrMsg,
        type: toast.TYPE.ERROR,
        autoClose: 3000
      })

      addOutput(`${err}`)

      await esploader.port.close()
      await esploader.disconnect()
    } finally {
      setConnecting(false)
    }
  }

  // Erase firmware on ESP
  const erase = async () => {
    setConfirmErase(false)
    setFlashing(true)
    toast(`Erasing flash memory. Please wait...`, { position: 'top-center', toastId: 'erase', autoClose: false })

    try {
      const stamp = Date.now()

      addOutput(`Start erasing`)
      const interval = setInterval(() => {
        addOutput(`Erasing flash memory. Please wait...`)
      }, 3000)

      await espStub.eraseFlash()

      clearInterval(interval)
      addOutput(`Finished. Took ${Date.now() - stamp}ms to erase.`)
      toast.update('erase', { render: 'Finished erasing memory.', type: toast.TYPE.INFO, autoClose: 3000 })
    } catch (e) {
      addOutput(`ERROR!\n${e}`)
      toast.update('erase', { render: `ERROR!\n${e}`, type: toast.TYPE.ERROR, autoClose: 3000 })
      console.error(e)
    } finally {
      setFlashing(false)
    }
  }

  // Flash Firmware
  const program = async () => {
    setConfirmProgram(false)
    setFlashing(true)

    let success = false

    const toArrayBuffer = async (inputFile) => {
      const response = await fetch(inputFile)

      if (!response.ok) {
        throw new Error(`Failed to download ${inputFile}`)
      }

      return await response.arrayBuffer()
    }

    for (const file of uploads) {
      if (!file.fileName || !file.obj) continue
      success = true

      toast(`Uploading ${file.fileName.substring(0, 28)}...`, { position: 'top-center', progress: 0, toastId: 'upload' })

      try {
        const contents = await toArrayBuffer(file.obj)

        await espStub.flashData(
          contents,
          (bytesWritten, totalBytes) => {
            const progress = (bytesWritten / totalBytes)
            const percentage = Math.floor(progress * 100)

            toast.update('upload', { progress: progress })

            addOutput(`Flashing... ${percentage}%`)
          },
          parseInt(file.offset, 16)
        )

        await sleep(100)
      } catch (e) {
        addOutput(`ERROR!`)
        addOutput(`${e}`)
        console.error(e)
      }
    }

    if (success) {
      addOutput(`Done!`)
      addOutput(`To run the new firmware please reset your device.`)

      toast.success('Done! Reset ESP to run new firmware.', { position: 'top-center', toastId: 'uploaded', autoClose: 3000 })
    } else {
      addOutput(`Please select a release`)

      toast.info('Please select a release', { position: 'top-center', toastId: 'uploaded', autoClose: 3000 })
    }

    setFlashing(false)
  }

  return (
    <Box sx={{ minWidth: '25rem' }}>
      <Header sx={{ mb: '1rem' }} />

      <Grid container spacing={1} direction='column' justifyContent='space-around' alignItems='center' sx={{ minHeight: 'calc(100vh - 116px)' }}>

        {/* Home Page */}
        {!connected && !connecting &&
          <Grid item>
            <Home
              connect={clickConnect}
              supported={supported}
              openSettings={() => setSettingsOpen(true)}
            />
          </Grid>
        }

        {/* Home Page */}
        {!connected && connecting &&
          <Grid item>
            <Typography variant='h3' component='h2' sx={{ color: '#aaa' }}>
              Connecting...
            </Typography>
          </Grid>
        }

        {/* FileUpload Page */}
        {connected &&
          <Grid item>
            <ReleaseList
              releases={releases}
              selectedReleaseId={selectedReleaseId}
              setSelectedReleaseId={selectRelease}
              uploads={uploads}
              loading={loadingReleases}
            />
          </Grid>
        }

        {/* Erase & Program Buttons */}
        {connected &&
          <Grid item>
            <Buttons
              erase={() => setConfirmErase(true)}
              program={() => setConfirmProgram(true)}
              disabled={flashing || loadingReleases}
            />
          </Grid>
        }

        {/* Serial Output */}
        {supported() &&
          <Grid item>
            <Output received={output} />
          </Grid>
        }
      </Grid>

      {/* Settings Window */}
      <Settings
        open={settingsOpen}
        close={() => setSettingsOpen(false)}
        setSettings={setSettings}
        settings={settings}
        connected={connected}
      />

      {/* Confirm Erase Window */}
      <ConfirmWindow
        open={confirmErase}
        text={'This will erase the memory of your ESP.'}
        onOk={erase}
        onCancel={() => setConfirmErase(false)}
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
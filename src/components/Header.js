import React from 'react'
import PropTypes from 'prop-types'

import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const Header = (props) => {
    return (
        <AppBar
            position='static'
            sx={{
                ...props.sx,
                background: '#1a1a1a',
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box component='a' href='https://autofill.com' target='_blank' rel='noopener noreferrer'>
                        <Box component='img' src='/autofill_logo.webp' alt='Autofill' sx={{ height: 40, display: 'block' }} />
                    </Box>
                    <Typography sx={{ ml: 2, fontFamily: '"Roboto Condensed", Roboto, sans-serif', fontWeight: 400, fontSize: '1.1rem', color: '#fff' }}>
                        Firmware Update
                    </Typography>
                </Box>
                <Box component='a' href='https://monocure3d.com.au' target='_blank' rel='noopener noreferrer'>
                    <Box component='img' src='/m3d_logo.webp' alt='Monocure' sx={{ height: 40, display: 'block' }} />
                </Box>
            </Toolbar>
        </AppBar>
    )
}

Header.propTypes = {
    sx: PropTypes.object,
}

export default Header

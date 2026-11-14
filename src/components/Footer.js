import React from 'react'
import PropTypes from 'prop-types'

import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import version from '../version.js'

const Footer = (props) => {
    return (
        <Box sx={props.sx}>
            <Box sx={{ mx: 'auto', mt: 0 }}>
                <Typography align='center' display='block'>
                    <Link href='https://monocure3d.com.au' target='_blank' underline='hover' color='inherit'>
                        Monocure3D
                    </Link>
                </Typography>
            </Box>

            {/* Version */}
            <Typography variant='caption' align='center' display='block' sx={{ color: 'text.secondary' }}>
                <Link
                    href='https://github.com/ifeelagood/espwebtool'
                    target='_blank'
                    underline='hover'
                    color='inherit'
                >
                    {`v${version.name} (${version.commit})`}
                </Link>
            </Typography>
        </Box>
    )
}

Footer.propTypes = {
    sx: PropTypes.object,
}

export default Footer

import React from 'react'
import PropTypes from 'prop-types'

import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

const Footer = (props) => {
    return (
        <Box sx={props.sx}>
            <Box sx={{ mx: 'auto', mt: 0 }}>
                <Typography
                align='center'
                display='block'>
                <Link href='https://monocure3d.com.au' target='_blank' underline='hover' color='inherit'>Monocure3D</Link>
                </Typography>
            </Box>

        </Box>
    )
}

Footer.propTypes = {
    sx: PropTypes.object,
}

export default Footer

import React from 'react'
import PropTypes from 'prop-types'

import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'

const Buttons = (props) => {
    return (
        <Grid container spacing={2} direction='row' justifyContent='center' alignItems='center' sx={{ mt: 2 }}>
            <Grid item>
                <Button variant='outlined' color='warning' onClick={props.disconnect} disabled={props.disabled}>
                    Disconnect
                </Button>
            </Grid>
            <Grid item>
                <Button
                    variant='contained'
                    color='success'
                    onClick={props.program}
                    disabled={props.disabled}
                    sx={{ px: 4, py: 1.5 }}
                >
                    UPLOAD
                </Button>
            </Grid>
        </Grid>
    )
}

Buttons.propTypes = {
    disconnect: PropTypes.func,
    program: PropTypes.func,
    disabled: PropTypes.bool,
}

export default Buttons

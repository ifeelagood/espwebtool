import React from 'react'
import PropTypes from 'prop-types'

import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

const ReleaseList = ({ releases, selectedReleaseId, setSelectedReleaseId, loading }) => {
  return (
    <Box sx={{ minWidth: '22rem' }}>
      <FormControl fullWidth>
        <InputLabel id='release-select-label'>Release</InputLabel>
        <Select
          labelId='release-select-label'
          value={selectedReleaseId}
          label='Release'
          onChange={(e) => setSelectedReleaseId(e.target.value)}
          disabled={loading || releases.length === 0}
          sx={{ backgroundColor: '#1a1a1a' }}
          MenuProps={{ PaperProps: { sx: { backgroundColor: '#1a1a1a' } } }}
        >
          {releases.map((release) => (
            <MenuItem key={release.id} value={String(release.id)}>
              {release.tag_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

    </Box>
  )
}

ReleaseList.propTypes = {
  releases: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      tag_name: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedReleaseId: PropTypes.string.isRequired,
  setSelectedReleaseId: PropTypes.func.isRequired,
  // uploads: PropTypes.arrayOf(
  //   PropTypes.shape({
  //     fileName: PropTypes.string.isRequired,
  //     offset: PropTypes.string.isRequired,
  //     obj: PropTypes.string,
  //   })
  // ).isRequired,
  loading: PropTypes.bool.isRequired,
}

export default ReleaseList;
import { filter, map } from 'lodash/fp'
import { useEffect, useState } from 'react'
import { div, label, span } from 'react-hyperscript-helpers'
import { collapseCromwellStatus } from 'src/components/job-common'


const calcStatusCount = calls => {
  const statusMap = {}
  calls.forEach(call => {
    const { executionStatus, backendStatus } = call
    const cromwellStatus = collapseCromwellStatus(executionStatus, backendStatus)
    if (!statusMap[cromwellStatus.label]) {
      statusMap[cromwellStatus.label] = { styleOptions: cromwellStatus, count: 1 }
    } else {
      statusMap[cromwellStatus.label].count += 1
    }
    call.uiStatusLabel = cromwellStatus.label
  })

  return statusMap
}


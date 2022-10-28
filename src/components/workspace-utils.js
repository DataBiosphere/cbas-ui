import _ from 'lodash/fp'
import { useState } from 'react'
import { Ajax } from 'src/libs/ajax'
import { withErrorReporting } from 'src/libs/error'
import { getLocalPref, setLocalPref } from 'src/libs/prefs'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'




export const recentlyViewedPersistenceId = 'workspaces/recentlyViewed'

export const updateRecentlyViewedWorkspaces = workspaceId => {
    const recentlyViewed = getLocalPref(recentlyViewedPersistenceId)?.recentlyViewed || []
    //Recently viewed workspaces are limited to 4. Additionally, if a user clicks a workspace multiple times,
    //we only want the most recent instance stored in the list.
    const updatedRecentlyViewed = _.flow(
      _.remove({ workspaceId }),
      _.concat([{ workspaceId, timestamp: Date.now() }]),
      _.orderBy(['timestamp'], ['desc']),
      _.take(4)
    )(recentlyViewed)
    setLocalPref(recentlyViewedPersistenceId, { recentlyViewed: updatedRecentlyViewed })
}



export const useWorkspaceDetails = ({ namespace, name }, fields) => {
    const [workspace, setWorkspace] = useState()

    const [loading, setLoading] = useState(true)
    const signal = useCancellation()

    const refresh = _.flow(
      withErrorReporting('Error loading workspace details'),
      Utils.withBusyState(setLoading)
    )(async () => {
      const ws = await Ajax(signal).Workspaces.workspace(namespace, name).details(fields)
      setWorkspace(ws)
    })

    useOnMount(refresh)

    return { workspace, refresh, loading }
}

import { h1 } from 'react-hyperscript-helpers'


export const PreviousRuns = () => {
  return h1(['Hello World!'])
}

export const navPaths = [
  {
    name: 'previous-runs',
    path: '/previous-runs',
    component: PreviousRuns,
    public: true
  }
]

import CircularProgress from '@mui/material/CircularProgress'

import style from './Loader.module.scss'

const Loader = () => (
  <div className={style.loader}>
    <CircularProgress />
  </div>
)

export default Loader

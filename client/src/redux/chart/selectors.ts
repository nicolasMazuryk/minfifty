import { IRootState } from '@/redux/reducer'

import { prefix } from './actions'

export const chartIndicator = (state: IRootState) => state[prefix].chartIndicator

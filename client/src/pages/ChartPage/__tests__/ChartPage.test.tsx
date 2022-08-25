import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import ChartPage from '../ChartPage'

test('Chart Page Example', () => {
  render(<ChartPage />)
  const h3 = screen.getByRole('heading')
  expect(h3).toHaveTextContent('Chart page')
})

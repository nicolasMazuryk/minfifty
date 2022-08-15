import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import HomePage from '../HomePage'

test('Home Page Example', () => {
  render(<HomePage />)
  const h3 = screen.getByRole('heading')
  expect(h3).toHaveTextContent('Home page')
})

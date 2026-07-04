import React from 'react'
import { render, screen } from '@testing-library/react'
import App from './App'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
})

test('renders App component', () => {
  render(<App />)
  // The masthead logo confirms the app mounted.
  expect(screen.getByAltText('logo')).toBeInTheDocument()
  // The on-screen keyboard renders its Enter key.
  expect(screen.getByText('Enter')).toBeInTheDocument()
})

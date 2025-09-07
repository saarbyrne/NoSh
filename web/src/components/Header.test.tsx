import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from './Header';

describe('Header', () => {
  it('renders with the correct title', () => {
    render(<Header title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('has the correct CSS classes', () => {
    render(<Header title="Test Title" />);
    const headerElement = screen.getByRole('heading');
    expect(headerElement).toHaveClass('text-xl', 'font-medium', 'text-foreground');
  });
});
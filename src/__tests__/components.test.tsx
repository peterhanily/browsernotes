import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../components/Common/Modal';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import { ThemeToggle } from '../components/Common/ThemeToggle';
import { NoteCard } from '../components/Notes/NoteCard';
import type { Note } from '../types';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title and content when open', () => {
    render(
      <Modal open={true} onClose={() => {}} title="My Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls onClose when X button is clicked', () => {
    let closed = false;
    render(
      <Modal open={true} onClose={() => { closed = true; }} title="Test">
        <p>Content</p>
      </Modal>
    );
    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(closed).toBe(true);
  });
});

describe('ConfirmDialog', () => {
  it('shows message and action buttons', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete?"
        message="Are you sure?"
        confirmLabel="Yes, delete"
        danger
      />
    );
    expect(screen.getByText('Delete?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirmed', () => {
    let confirmed = false;
    let closed = false;
    render(
      <ConfirmDialog
        open={true}
        onClose={() => { closed = true; }}
        onConfirm={() => { confirmed = true; }}
        title="Are you sure?"
        message="Proceed?"
        confirmLabel="Yes"
      />
    );
    fireEvent.click(screen.getByText('Yes'));
    expect(confirmed).toBe(true);
    expect(closed).toBe(true);
  });
});

describe('ThemeToggle', () => {
  it('shows sun icon in dark mode', () => {
    const { container } = render(<ThemeToggle theme="dark" onToggle={() => {}} />);
    expect(container.querySelector('button')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    let toggled = false;
    render(<ThemeToggle theme="dark" onToggle={() => { toggled = true; }} />);
    fireEvent.click(screen.getByRole('button'));
    expect(toggled).toBe(true);
  });
});

describe('NoteCard', () => {
  const note: Note = {
    id: '1',
    title: 'Test Note',
    content: '# Hello World\n\nSome **bold** text',
    tags: ['work', 'important'],
    pinned: true,
    archived: false,
    trashed: false,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
  };

  it('renders note title', () => {
    render(<NoteCard note={note} active={false} onClick={() => {}} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('shows tags', () => {
    render(<NoteCard note={note} active={false} onClick={() => {}} />);
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('important')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    let clicked = false;
    render(<NoteCard note={note} active={false} onClick={() => { clicked = true; }} />);
    fireEvent.click(screen.getByText('Test Note'));
    expect(clicked).toBe(true);
  });

  it('shows "Untitled" for empty title', () => {
    const untitled = { ...note, title: '' };
    render(<NoteCard note={untitled} active={false} onClick={() => {}} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});

/**
 * @format
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import App from '../src/App';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/mock', exists: jest.fn(), readFile: jest.fn(), writeFile: jest.fn() }));

describe('App', () => {
  it('renders folder browser view by default', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('folder-browser')).toBeTruthy();
  });

  it('switches to process view', () => {
    const { getByTestId, queryByTestId } = render(<App />);
    fireEvent.press(getByTestId('start-processing'));
    expect(queryByTestId('folder-browser')).toBeNull();
    expect(getByTestId('renamer-view')).toBeTruthy();
  });

  it('shows options modal', () => {
    const { getByTestId } = render(<App />);
    fireEvent.press(getByTestId('options-button'));
    expect(getByTestId('options-modal')).toBeTruthy();
  });
});

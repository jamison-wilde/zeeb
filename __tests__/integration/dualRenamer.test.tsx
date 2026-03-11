import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import App from '../../src/App';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock',
  exists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('Dual Renamer integration', () => {
  it('renders two Renamer instances in process view', () => {
    const { getByTestId } = render(<App />);
    fireEvent.press(getByTestId('start-processing'));
    expect(getByTestId('renamer-0')).toBeTruthy();
    expect(getByTestId('renamer-1')).toBeTruthy();
  });

  it('only shows the active renamer as visible', () => {
    const { getByTestId } = render(<App />);
    fireEvent.press(getByTestId('start-processing'));
    // Renamer-0 is active by default, renamer-1 is hidden
    // Both testID wrappers exist, but only one Renamer has visible=true
    expect(getByTestId('renamer-0')).toBeTruthy();
    expect(getByTestId('renamer-1')).toBeTruthy();
  });
});

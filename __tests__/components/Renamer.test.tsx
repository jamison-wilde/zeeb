import React from 'react';
import { render } from '@testing-library/react-native';
import { Renamer } from '../../src/components/Renamer';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/mock' }));

describe('Renamer', () => {
  it('renders sub-components', () => {
    const { getByTestId } = render(<Renamer instanceId={0} visible={true} />);
    expect(getByTestId('file-list')).toBeTruthy();
    expect(getByTestId('search-parts')).toBeTruthy();
    expect(getByTestId('movie-results')).toBeTruthy();
    expect(getByTestId('rename-preview')).toBeTruthy();
  });

  it('renders WebView', () => {
    const { getByTestId } = render(<Renamer instanceId={0} visible={true} />);
    expect(getByTestId('imdb-webview')).toBeTruthy();
  });
});

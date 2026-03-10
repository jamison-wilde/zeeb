jest.mock('react-native-fs', () => ({
  appendFile: jest.fn().mockResolvedValue(undefined),
}));

import RNFS from 'react-native-fs';
import { createLogger } from '../../src/services/logger';

describe('logger', () => {
  beforeEach(() => jest.clearAllMocks());

  it('appends timestamped entry to log file', async () => {
    const logger = createLogger('/mock/zeeb.log');
    await logger.log('rename', '/old.mkv', '/new.mkv');
    expect(RNFS.appendFile).toHaveBeenCalledWith(
      '/mock/zeeb.log',
      expect.stringMatching(/\d{4}-\d{2}-\d{2}.*rename.*\/old\.mkv.*\/new\.mkv/),
      'utf8',
    );
  });

  it('logs different operation types', async () => {
    const logger = createLogger('/mock/zeeb.log');
    await logger.log('poster', '/movie.jpg', null);
    expect(RNFS.appendFile).toHaveBeenCalled();
  });
});

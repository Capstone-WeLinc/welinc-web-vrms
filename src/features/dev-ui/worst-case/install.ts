import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { readDataMode } from './dataMode';
import { decoratedData, isSettingsHubWrite, madeUpData } from './settingsData';
import { isFormWrite, madeUpFormData } from './formData';
import { isAttachmentWrite, madeUpAttachments } from './attachmentsData';
import { madeUpHistory } from './historyData';
import { isUsersWrite, madeUpUsers } from './usersData';

const READ_ONLY = 'Fixture data is showing, so saves are off. Switch to Demo data to save.';

function answer(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  return { data, status, statusText: status === 200 ? 'OK' : 'Bad Request', headers: {}, config };
}

/** Development only (break-ui): swaps the Settings hub's responses for the chosen dataset. */
export function installDataModes(api: AxiosInstance) {
  api.interceptors.request.use((config) => {
    const mode = readDataMode();
    if (mode === 'demo' || !config.url) return config;
    if (isSettingsHubWrite(config.method, config.url) || isFormWrite(config.method, config.url) || isAttachmentWrite(config.method, config.url) || isUsersWrite(config.method, config.url)) {
      config.adapter = () =>
        Promise.reject(new AxiosError(READ_ONLY, AxiosError.ERR_BAD_REQUEST, config, null, answer(config, 400, { message: READ_ONLY })));
      return config;
    }
    if (config.method?.toLowerCase() === 'get') {
      const data =
        madeUpUsers(mode, config.url, config.params ?? {}) ??
        madeUpAttachments(mode, config.url) ??
        madeUpHistory(mode, config.url, config.params ?? {}) ??
        madeUpFormData(mode, config.url, config.params ?? {}) ??
        madeUpData(mode, config.url, config.params ?? {});
      if (data !== undefined) config.adapter = () => Promise.resolve(answer(config, 200, data));
    }
    return config;
  });

  api.interceptors.response.use((response) => {
    const { url, method } = response.config;
    if (!url || method?.toLowerCase() !== 'get') return response;
    const data = decoratedData(readDataMode(), url, response.data);
    return data === undefined ? response : { ...response, data };
  });
}

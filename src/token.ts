import axios from "axios";
import * as fs from "fs";
import * as ini from "ini";

import { IUnmockOptions } from "./unmock-options";

const UNMOCK_DIR = ".unmock";
const TOKEN_FILE = ".token";
const CONFIG_FILE = "credentials";
const TOKEN_PATH = `${UNMOCK_DIR}/${TOKEN_FILE}`;
const CONFIG_PATH = `${UNMOCK_DIR}/${CONFIG_FILE}`;

const makeHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const ensureUnmockDirExists = () => {
  if (fs.existsSync(UNMOCK_DIR)) {
    return;
  }
  fs.mkdirSync(UNMOCK_DIR);
};

export const getAccessToken = () => {
  return fs.readFileSync(TOKEN_PATH).toString();
};

export const accessTokenIsPresent = () => {
  return fs.existsSync(TOKEN_PATH);
};

export const getRefreshToken = () => {
  const config = ini.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  return config.unmock.token;
};

// TODO: combine these two
export const refreshTokenIsPresent = () => {
  return fs.existsSync(CONFIG_PATH);
};

export const canPingWithAccessToken = async (accessToken: string, unmockHost: string) => {
  try {
    await axios.get(`https://${unmockHost}/ping`, makeHeader(accessToken));
    return true;
  } catch (e) {
    return false;
  }
};

export const exchangeRefreshTokenForAccessToken = async (refreshToken: string, unmockHost: string) => {
  try {
    const { data: { accessToken }} = await axios.post(`https://${unmockHost}/token/access`, {
      refreshToken,
    });
    return accessToken;
  } catch (e) {
    throw Error("Invalid token, please check your credentials on https://www.unmock.io/app");
  }
};

export const writeAccessTokenToFile = (accessToken: string) => {
  ensureUnmockDirExists();
  fs.writeFileSync(TOKEN_PATH, accessToken);
};

let pingable = false;
export default async ({unmockHost}: IUnmockOptions) => {
  let accessToken = null;
  if (accessTokenIsPresent()) {
    const maybeAccessToken = getAccessToken();
    if (!pingable) {
      pingable = await canPingWithAccessToken(maybeAccessToken, unmockHost);
      if (pingable) {
        accessToken = maybeAccessToken;
      }
    }
  }
  if (accessToken === null) {
    if (refreshTokenIsPresent()) {
      const refreshToken = getRefreshToken();
      accessToken = await exchangeRefreshTokenForAccessToken(refreshToken, unmockHost);
      writeAccessTokenToFile(accessToken);
    } else {
      // tslint:disable-next-line:max-line-length
      throw Error("Unmock token is not present.  Please fetch your unmock token from unmock.io/app to use the service.");
    }
  }
  if (!pingable) {
    pingable = await canPingWithAccessToken(accessToken, unmockHost);
    if (!pingable) {
      throw Error("Internal authorization error");
    }
  }
  return accessToken;
};
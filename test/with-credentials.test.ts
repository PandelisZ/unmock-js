/**
 * @jest-environment node
 */

import axios from "axios";
import fs from "fs";
import * as rimraf from "rimraf";
import { kcomnu, unmock } from "../dist";

beforeEach(async () => {
  require("dotenv").config();
  const CREDENTIALS = `[unmock]
token=${process.env.UNMOCK_TOKEN}
`;
  rimraf.sync(".unmock");
  fs.mkdirSync(".unmock");
  fs.writeFileSync(".unmock/credentials", CREDENTIALS);
  await unmock({
      unmockHost: process.env.UNMOCK_HOST,
      unmockPort: process.env.UNMOCK_PORT,
  });
});

afterEach(async () => {
  await kcomnu();
  rimraf.sync(".unmock");
});

test("credentials written to .unmock/credentials work just like a token", async () => {
  const { data: { projects } }  = await axios("https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200");
  expect(typeof projects[0].id).toBe("number");
});

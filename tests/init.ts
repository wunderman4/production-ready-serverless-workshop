// @ts-ignore
import * as awsCred from "awscred";
import { config } from "dotenv";
import { promisify } from "util";

config();

let initialized = false;

export const init = async () => {
  if (initialized) return;
  console.log("Loading AWS credentials");
  try {
    const { credentials, region } = await promisify(awsCred.load)();
    console.log("AWS credentials loaded");
    process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    process.env.AWS_REGION = region;

    if (credentials.sessionToken) {
      process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
    }
  } catch (e) {
    console.error("Error loading AWS credentials: ", e);
    throw e;
  }
  // console.log("AWS credential loaded");

  initialized = true;
};

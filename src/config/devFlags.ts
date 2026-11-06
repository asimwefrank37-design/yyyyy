// Dev shortcuts never turn on when NODE_ENV is production, even if the flag is left in .env.
const devFlag = (name: string) =>
  process.env.NODE_ENV !== "production" && process.env[name] === "true";

export const devSessionEnabled = () => devFlag("ALLOW_DEV_SESSION");

export const devResetCodeEnabled = () => devFlag("ALLOW_DEV_RESET_CODE");

export const DEV_USER_ID = "dev-author";

// Vercel deployments always require authentication, even if somebody sets the
// optional local-development flag to false. Never infer identity from Host headers.
export const isHosted = () => process.env.VERCEL === '1' || process.env.COMMAND_HOSTED === 'true';
export const LOCAL_WORKSPACE_ID = 'local';

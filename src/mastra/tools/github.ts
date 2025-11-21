import { GithubIntegration } from "@mastra/github";


// Helper function to get key from config or env
const getApiKey = (configKey: string, envKey: string): string => {
    const configValue = config.get(configKey);
    if (configValue) return configValue;

    const envValue = process.env[envKey];
    if (envValue) return envValue;

    return '';
};

export const github = new GithubIntegration({
    config: {
        PERSONAL_ACCESS_TOKEN: getApiKey('GITHUB_PERSONAL_ACCESS_TOKEN', 'GITHUB_PERSONAL_ACCESS_TOKEN'),
    }
});

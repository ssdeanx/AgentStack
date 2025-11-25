import { GithubIntegration } from "@mastra/github";

export const github = new GithubIntegration({
    config: {
        PERSONAL_ACCESS_TOKEN: process.env.GITHUB_API_KEY || process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    }
});

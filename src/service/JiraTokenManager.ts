export class JiraTokenManager {
    private static instance: JiraTokenManager;
    private domain: string;
    private userName: string;
    private apiToken: string;

    private constructor(domain: string, userName: string, apiToken: string) {
        this.domain = domain;
        this.userName = userName;
        this.apiToken = apiToken;
    }

    public static initialize(domain: string, userName: string, apiToken: string): void {
        if (!JiraTokenManager.instance) {
            JiraTokenManager.instance = new JiraTokenManager(domain, userName, apiToken);
        }
    }

    public static getInstance(): JiraTokenManager {
        if (!JiraTokenManager.instance) {
            throw new Error("JiraTokenManager is not initialized.");
        }
        return JiraTokenManager.instance;
    }

    public getDomain(): string {
        return this.domain;
    }

    public setDomain(domain: string): void {
        this.domain = domain;
    }

    public getUserName(): string {
        return this.userName;
    }

    public setUserName(userName: string): void {
        this.userName = userName;
    }

    public getApiToken(): string {
        return this.apiToken;
    }

    public setApiToken(apiToken: string): void {
        this.apiToken = apiToken;
    }
}

import axios from 'axios';
import dotenv from 'dotenv';

// Configuração do dotenv para carregar variáveis de ambiente
dotenv.config();

const JIRA_API_URL = 'https://{{domain}}.atlassian.net/rest/api/3/{{entity}}';

export function axiosInstance(domain: string, userName: string, apiToken: string, entity: string) {
    return axios.create({
        baseURL: JIRA_API_URL.replace('{{domain}}', domain).replace('{{entity}}', entity),
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        auth: {
            username: userName,
            password: apiToken
        }
    });
} 

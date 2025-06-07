import axios from 'axios';
import dotenv from 'dotenv';

// Configuração do dotenv para carregar variáveis de ambiente
dotenv.config();

const GITHUB_API_URL = 'https://api.github.com/graphql';


export function axiosInstance(github_token: string) {
    return axios.create({
        baseURL: GITHUB_API_URL,
        headers: {
            Authorization: `Bearer ${github_token}`,
            'Content-Type': 'application/json',
        },
    }); 
} 

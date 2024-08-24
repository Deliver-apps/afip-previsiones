export interface User {
    id: number;
    username: string;
    password: string;
    is_company: boolean;
    company_name?: string;
    real_name: string;
    cuit_company?: string;
}
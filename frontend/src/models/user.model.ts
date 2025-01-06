export interface User {
  id: number;
  username: string;
  password: string;
  is_company: boolean;
  company_name?: string;
  real_name: string;
  cuit_company?: string;
}

export interface UserVeps {
  id: number;
  real_name: string;
  alter_name: string;
  mobile_number: string;
  last_execution?: string;
  execution_date?: string;
  need_papers: boolean;
  is_group: boolean;
  cuit: string;
}

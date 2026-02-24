export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  username: string;
  todos: any;
}

import { Injectable } from '@angular/core';
import { AuthRequest } from '../models/auth.model';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { AuthResponse } from '../models/auth.model';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}

  private loggedIn = new BehaviorSubject<boolean>(this.hasValidToken());
  isLoggedIn$ = this.loggedIn.asObservable();

  private hasValidToken(): boolean {
    const token = localStorage.getItem('revado_token');
    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);
      const isExpired = decoded.exp * 1000 < Date.now();
      if (isExpired) {
        this.logout();
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  login(credentials: AuthRequest) {
    return this.http.post(`${environment.apiUrl}/auth/login`, credentials, {
      responseType: 'text',
    });
  }

  logout() {
    localStorage.removeItem('revado_token');
    this.loggedIn.next(false);
  }

  register(credentials: AuthRequest) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, credentials);
  }

  saveToken(token: string) {
    localStorage.setItem('revado_token', token);
    this.loggedIn.next(true);
  }

  getToken() {
    return localStorage.getItem('revado_token');
  }
}

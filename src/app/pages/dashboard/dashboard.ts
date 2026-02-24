import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { AuthRequest } from '../../models/auth.model';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
@Component({
  selector: 'app-dashboard',
  imports: [ButtonModule, DialogModule, InputTextModule, FormsModule, ToastModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  isLoginVisible: boolean = false;
  isLoginMode: boolean = true; // True = Sign In, False = Sign Up
  isUserLoggedIn: boolean = false;

  userNameInput = '';
  passwordInput = '';

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
  ) {
    this.authService.isLoggedIn$.subscribe((status) => {
      this.isUserLoggedIn = status;
    });
  }

  onSubmit() {
    const credentials: AuthRequest = {
      username: this.userNameInput,
      password: this.passwordInput,
    };

    if (this.isLoginMode) {
      this.authService.login(credentials).subscribe({
        next: (tokenString) => {
          console.log('Login Success, token: ' + tokenString);
          this.authService.saveToken(tokenString);
          this.isLoginVisible = false;
        },
      });
    } else {
      this.authService.register(credentials).subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Registration successful! Please sign in.',
          });
          this.isLoginMode = true;
          console.log('Register Success: ' + response);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Registration failed. Username might be taken. ',
          });
        },
      });
    }
  }

  handleSignOut() {
    this.authService.logout();
  }
}

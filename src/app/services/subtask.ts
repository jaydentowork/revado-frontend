import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { Subtask } from '../models/todo.model';

@Injectable({
  providedIn: 'root',
})
export class SubtaskService {
  private apiUrl = `${environment.apiUrl}/subtask`;

  constructor(private http: HttpClient) {}

  createSubtask(todoId: string, payload: { title: string; completed: boolean }) {
    return this.http.post<Subtask>(`${this.apiUrl}/create/${todoId}`, payload);
  }

  createSubtasksWithAi(todoId: string) {
    return this.http.post<Subtask[]>(`${this.apiUrl}/create-with-ai/${todoId}`, {});
  }

  updateSubtask(subtaskId: string, payload: { title: string; completed: boolean }) {
    return this.http.put<Subtask>(`${this.apiUrl}/${subtaskId}`, payload);
  }

  deleteSubtask(subtaskId: string) {
    return this.http.delete<void>(`${this.apiUrl}/${subtaskId}`);
  }
}

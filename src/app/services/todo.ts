import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Todo } from '../models/todo.model';

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private apiUrl = `${environment.apiUrl}/todo`;
  constructor(private http: HttpClient) {}

  getTodos(completed?: boolean) {
    let params = new HttpParams();
    if (completed !== undefined) {
      params = params.set('completed', completed.toString());
    }
    return this.http.get<Todo[]>(`${this.apiUrl}/get`, { params });
  }

  updateTodo(id: string, todo: Todo) {
    return this.http.put<Todo>(`${this.apiUrl}/${id}`, todo);
  }

  deleteTodo(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  createTodo(payload: {
    title: string;
    description: string;
    completed: boolean;
    subtaskList: unknown[];
  }) {
    return this.http.post<Todo>(`${this.apiUrl}/create`, payload);
  }
}

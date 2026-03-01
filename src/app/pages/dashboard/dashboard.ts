import { ChangeDetectorRef, Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { AuthRequest } from '../../models/auth.model';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TodoService } from '../../services/todo';
import { Subtask, Todo } from '../../models/todo.model';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SubtaskService } from '../../services/subtask';
@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    FormsModule,
    ToastModule,
    CardModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  isLoginVisible: boolean = false;
  isLoginMode: boolean = true; // True = Sign In, False = Sign Up
  isUserLoggedIn: boolean = false;

  userNameInput = '';
  passwordInput = '';
  selectedFilter: string = 'All';

  tasks: Todo[] = [];
  selectedTask: Todo | null = null;
  selectedTaskDraft: Todo | null = null;
  isSavingTask = false;
  isDeletingTask = false;
  isCreatingTask = false;
  isAddingSubtask = false;
  isGeneratingSubtasksAi = false;
  newSubtaskTitle = '';
  private tasksSubscription?: Subscription;
  private updateTaskSubscription?: Subscription;
  private deleteTaskSubscription?: Subscription;
  private createTaskSubscription?: Subscription;
  private createSubtaskSubscription?: Subscription;
  private aiSubtaskSubscription?: Subscription;
  private subtaskUpdatingIds = new Set<string>();
  private subtaskDeletingIds = new Set<string>();
  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private todoService: TodoService,
    private subtaskService: SubtaskService,
    private cdr: ChangeDetectorRef,
  ) {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isUserLoggedIn = loggedIn;

      if (loggedIn) {
        this.selectedFilter = 'All';
        this.loadTasks();
      } else {
        this.tasksSubscription?.unsubscribe();
        this.updateTaskSubscription?.unsubscribe();
        this.deleteTaskSubscription?.unsubscribe();
        this.createTaskSubscription?.unsubscribe();
        this.aiSubtaskSubscription?.unsubscribe();
        this.selectedFilter = 'All';
        this.tasks = [];
        this.selectedTask = null;
        this.selectedTaskDraft = null;
        this.newSubtaskTitle = '';
        this.isAddingSubtask = false;
        this.isGeneratingSubtasksAi = false;
        this.createSubtaskSubscription?.unsubscribe();
        this.subtaskUpdatingIds.clear();
        this.subtaskDeletingIds.clear();
        this.cdr.detectChanges();
      }
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

  loadTasks() {
    let filter: boolean | undefined;
    if (this.selectedFilter === 'Completed') filter = true;
    if (this.selectedFilter === 'Incompleted') filter = false;

    // Cancel any in-flight request so fast filter switches always use latest click.
    this.tasksSubscription?.unsubscribe();
    this.tasksSubscription = this.todoService.getTodos(filter).subscribe({
      next: (data) => {
        this.tasks = data;
        if (this.selectedTask) {
          const updatedSelected = data.find((task) => task.id === this.selectedTask!.id);
          if (updatedSelected) {
            this.selectedTask = updatedSelected;
            this.selectedTaskDraft = this.toTaskDraft(updatedSelected);
          } else {
            this.selectedTask = null;
            this.selectedTaskDraft = null;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not fetch tasks',
        });
      },
    });
  }

  onFilterChange(newFilter: string) {
    this.selectedFilter = newFilter;
    this.loadTasks();
  }

  selectTask(task: Todo) {
    this.selectedTask = task;
    this.selectedTaskDraft = this.toTaskDraft(task);
  }

  createTodo() {
    if (!this.isUserLoggedIn || this.isCreatingTask) return;

    this.isCreatingTask = true;
    const payload = {
      title: 'New Task',
      description: '',
      completed: false,
      subtaskList: [],
    };

    this.createTaskSubscription?.unsubscribe();
    this.createTaskSubscription = this.todoService.createTodo(payload).subscribe({
      next: (createdTodo) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Created',
          detail: 'Todo created successfully.',
        });

        this.selectedTask = createdTodo;
        this.selectedTaskDraft = this.toTaskDraft(createdTodo);
        this.isCreatingTask = false;
        this.loadTasks();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not create todo',
        });
        this.isCreatingTask = false;
      },
    });
  }

  addSubtask() {
    const todoId = this.selectedTaskDraft?.id;
    const title = this.newSubtaskTitle.trim();

    if (!todoId || !title || this.isAddingSubtask) return;

    this.isAddingSubtask = true;
    this.createSubtaskSubscription?.unsubscribe();
    this.createSubtaskSubscription = this.subtaskService
      .createSubtask(todoId, { title, completed: false })
      .subscribe({
        next: (createdSubtask) => {
          if (!this.selectedTaskDraft) {
            this.isAddingSubtask = false;
            return;
          }

          this.selectedTaskDraft.subtaskList = [...(this.selectedTaskDraft.subtaskList ?? []), createdSubtask];
          this.syncSelectedTaskFromDraft();
          this.newSubtaskTitle = '';
          this.isAddingSubtask = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not create subtask',
          });
          this.isAddingSubtask = false;
        },
      });
  }

  generateSubtasksWithAi() {
    const todoId = this.selectedTaskDraft?.id;
    if (!todoId || this.isGeneratingSubtasksAi) return;

    this.isGeneratingSubtasksAi = true;
    this.aiSubtaskSubscription?.unsubscribe();
    this.aiSubtaskSubscription = this.subtaskService.createSubtasksWithAi(todoId).subscribe({
      next: (generatedSubtasks) => {
        if (!this.selectedTaskDraft) {
          this.isGeneratingSubtasksAi = false;
          return;
        }

        this.selectedTaskDraft.subtaskList = (generatedSubtasks ?? []).map((subtask) => ({ ...subtask }));
        this.syncSelectedTaskFromDraft();
        this.messageService.add({
          severity: 'success',
          summary: 'Generated',
          detail: 'Subtasks generated with AI.',
        });
        this.isGeneratingSubtasksAi = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not generate subtasks',
        });
        this.isGeneratingSubtasksAi = false;
      },
    });
  }

  saveSubtask(subtask: Subtask) {
    const subtaskId = subtask.id;
    if (!subtaskId || this.subtaskUpdatingIds.has(subtaskId)) return;

    this.subtaskUpdatingIds.add(subtaskId);
    this.subtaskService
      .updateSubtask(subtaskId, {
        title: (subtask.title ?? '').trim(),
        completed: !!subtask.completed,
      })
      .subscribe({
        next: (updatedSubtask) => {
          if (this.selectedTaskDraft?.subtaskList) {
            this.selectedTaskDraft.subtaskList = this.selectedTaskDraft.subtaskList.map((current) =>
              current.id === subtaskId ? { ...current, ...updatedSubtask } : current,
            );
            this.syncSelectedTaskFromDraft();
          }
          this.subtaskUpdatingIds.delete(subtaskId);
          this.cdr.detectChanges();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not update subtask',
          });
          this.subtaskUpdatingIds.delete(subtaskId);
        },
      });
  }

  deleteSubtask(subtaskId: string) {
    if (!subtaskId || this.subtaskDeletingIds.has(subtaskId)) return;

    const isConfirmed = window.confirm('Are you sure you want to delete this subtask?');
    if (!isConfirmed) return;

    this.subtaskDeletingIds.add(subtaskId);
    this.subtaskService.deleteSubtask(subtaskId).subscribe({
      next: () => {
        if (this.selectedTaskDraft?.subtaskList) {
          this.selectedTaskDraft.subtaskList = this.selectedTaskDraft.subtaskList.filter(
            (subtask) => subtask.id !== subtaskId,
          );
          this.syncSelectedTaskFromDraft();
        }
        this.subtaskDeletingIds.delete(subtaskId);
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not delete subtask',
        });
        this.subtaskDeletingIds.delete(subtaskId);
      },
    });
  }

  isSubtaskUpdating(subtaskId: string) {
    return this.subtaskUpdatingIds.has(subtaskId);
  }

  isSubtaskDeleting(subtaskId: string) {
    return this.subtaskDeletingIds.has(subtaskId);
  }

  saveSelectedTask() {
    if (!this.selectedTaskDraft || !this.selectedTaskDraft.id) return;

    this.isSavingTask = true;
    const payload: Todo = this.toTaskDraft(this.selectedTaskDraft);

    this.updateTaskSubscription?.unsubscribe();
    this.updateTaskSubscription = this.todoService.updateTodo(payload.id, payload).subscribe({
      next: (updatedTodo) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Todo updated successfully.',
        });

        this.selectedTask = updatedTodo;
        this.selectedTaskDraft = this.toTaskDraft(updatedTodo);
        this.loadTasks();
        this.isSavingTask = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not update todo',
        });
        this.isSavingTask = false;
      },
    });
  }

  deleteSelectedTask() {
    if (!this.selectedTaskDraft?.id) return;
    if (this.isDeletingTask) return;

    const isConfirmed = window.confirm('Are you sure you want to delete this todo?');
    if (!isConfirmed) return;

    this.isDeletingTask = true;
    const todoId = this.selectedTaskDraft.id;

    this.deleteTaskSubscription?.unsubscribe();
    this.deleteTaskSubscription = this.todoService.deleteTodo(todoId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Todo deleted successfully.',
        });

        this.selectedTask = null;
        this.selectedTaskDraft = null;
        this.isDeletingTask = false;
        this.loadTasks();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not delete todo',
        });
        this.isDeletingTask = false;
      },
    });
  }

  private toTaskDraft(task: Todo): Todo {
    return {
      ...task,
      title: task.title ?? '',
      description: task.description ?? '',
      subtaskList: (task.subtaskList ?? []).map((subtask) => ({ ...subtask })),
      user: task.user ?? null,
    };
  }

  private syncSelectedTaskFromDraft() {
    if (!this.selectedTaskDraft?.id) return;

    const syncedTask = this.toTaskDraft(this.selectedTaskDraft);
    this.selectedTask = syncedTask;
    this.tasks = this.tasks.map((task) => (task.id === syncedTask.id ? this.toTaskDraft(syncedTask) : task));
  }
}

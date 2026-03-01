export interface Subtask {
  id: string; // uuid
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string; // uuid
  title: string;
  description: string;
  completed: boolean;
  subtaskList: Subtask[];
  user: any;
}

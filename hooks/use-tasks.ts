import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type {
  Task,
  TaskWithCompletion,
  CreateTaskInput,
  UpdateTaskInput,
  CompleteTaskResult,
} from '@/types/database';

export function useTasks() {
  const token = useAuthStore((s) => s.token);

  return useQuery<TaskWithCompletion[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const tasks = await api.get<Task[]>('/tasks');
      return tasks.map((t) => ({ ...t, completed_today: false }));
    },
    enabled: !!token,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api.post<Task>('/tasks', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const prev = queryClient.getQueryData<TaskWithCompletion[]>(['tasks']);
      queryClient.setQueryData<TaskWithCompletion[]>(['tasks'], (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...data } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks'], ctx.prev);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      api.delete<{ deleted: boolean }>(`/tasks/${taskId}`),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const prev = queryClient.getQueryData<TaskWithCompletion[]>(['tasks']);
      queryClient.setQueryData<TaskWithCompletion[]>(['tasks'], (old) =>
        old?.filter((t) => t.id !== taskId),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks'], ctx.prev);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Task) =>
      api.post<CompleteTaskResult>(`/tasks/${task.id}/complete`),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const prev = queryClient.getQueryData<TaskWithCompletion[]>(['tasks']);
      queryClient.setQueryData<TaskWithCompletion[]>(['tasks'], (old) =>
        old?.map((t) => (t.id === task.id ? { ...t, completed_today: true } : t)),
      );
      return { prev };
    },
    onError: (_err, _task, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks'], ctx.prev);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

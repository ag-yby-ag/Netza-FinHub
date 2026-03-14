import { get, post, upload as uploadRequest } from './api';
import type { Upload, UploadPreview } from '../types/upload';

export function uploadFile(file: File): Promise<Upload> {
  const formData = new FormData();
  formData.append('file', file);
  return uploadRequest<Upload>('/uploads', formData);
}

export function getUploads(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<Upload[]> {
  return get<Upload[]>('/uploads', params as Record<string, string | number>);
}

export function getUpload(id: number | string): Promise<Upload> {
  return get<Upload>(`/uploads/${id}`);
}

export function getUploadPreview(id: number | string): Promise<UploadPreview> {
  return get<UploadPreview>(`/uploads/${id}/preview`);
}

export function confirmUpload(id: number | string): Promise<Upload> {
  return post<Upload>(`/uploads/${id}/confirm`);
}

export function cancelUpload(id: number | string): Promise<Upload> {
  return post<Upload>(`/uploads/${id}/cancel`);
}

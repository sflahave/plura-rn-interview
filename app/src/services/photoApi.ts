import { Platform } from 'react-native';
import { APIPhoto, APIPhotoBase } from '../types/api';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://192.168.1.13:3000'
    : 'http://localhost:3000';

console.log("API_BASE_URL", API_BASE_URL);

export async function loadMemberPhotos(memberId: string): Promise<APIPhoto[]> {
  const response = await fetch(`${API_BASE_URL}/member/${memberId}/photos`);
  return response.json();
}

export async function addMemberPhoto(
  memberId: string,
  photo: APIPhotoBase,
): Promise<APIPhoto> {
  const response = await fetch(`${API_BASE_URL}/member/${memberId}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(photo),
  });
  return response.json();
}

export async function deleteMemberPhoto(photoId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/photos/${photoId}`, {
    method: 'DELETE',
  });
}

export async function updateMemberPhoto(photo: APIPhoto): Promise<APIPhoto> {
  const response = await fetch(`${API_BASE_URL}/photos/${photo.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(photo),
  });
  return response.json();
}

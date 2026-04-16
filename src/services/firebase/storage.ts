import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import app from '@/services/firebase/config';

const storage = getStorage(app);

/**
 * 발제 참고 이미지를 Firebase Storage에 업로드.
 * @param topicId - Firestore topics 문서 ID
 * @param localUri - expo-image-picker가 반환한 로컬 파일 URI
 * @param onProgress - 업로드 진행률 콜백 (0~1)
 * @returns Firebase Storage 다운로드 URL
 */
export async function uploadTopicImage(
  topicId: string,
  localUri: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const filename = localUri.split('/').pop() ?? 'image.jpg';
  const uniqueName = `${Date.now()}_${filename}`;
  const storageRef = ref(storage, `topics/${topicId}/references/${uniqueName}`);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob);
    task.on(
      'state_changed',
      snapshot => {
        onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      },
    );
  });
}

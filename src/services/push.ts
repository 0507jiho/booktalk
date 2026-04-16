import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

// Expo Go에서는 푸시 알림 미지원 (SDK 53+) — 개발 빌드에서만 동작
const isExpoGo = Constants.appOwnership === 'expo';

// 포그라운드 상태에서 알림 표시 설정 (Expo Go에서는 스킵)
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * 푸시 알림 권한 요청 + FCM 토큰 취득 → Firestore users/{uid} 에 저장.
 * 물리 기기에서만 토큰 발급 가능 (에뮬레이터 불가).
 */
export async function registerPushToken(uid: string): Promise<void> {
  if (isExpoGo) return; // Expo Go에서는 푸시 토큰 등록 불가
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Android 알림 채널 설정 (Android 8+ 필수)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4A90E2',
      });
    }

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    await updateDoc(doc(db, 'users', uid), { fcmToken: token });
  } catch (e) {
    // 에뮬레이터·시뮬레이터 등 토큰 발급 불가 환경에서는 무시
    console.warn('푸시 토큰 등록 실패:', e);
  }
}

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchNotifications, markAllAsRead } from '@/services/firebase/notifications';
import { useAuthStore } from '@/stores/authStore';
import { Notification, NotificationType } from '@/types';
import dayjs from 'dayjs';

const TYPE_LABEL: Record<NotificationType, string> = {
  like: '좋아요',
  answer: '답변',
  follow: '팔로우',
  club_invite: '모임 초대',
  event_reminder: '일정 알림',
};

const TYPE_ICON: Record<NotificationType, string> = {
  like: '♥',
  answer: '💬',
  follow: '👤',
  club_invite: '📚',
  event_reminder: '📅',
};

export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { firebaseUser } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasUnread = notifications.some(n => !n.isRead);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    try {
      const data = await fetchNotifications(firebaseUser.uid);
      setNotifications(data);
    } catch (e) {
      console.error('알림 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMarkAllRead() {
    if (!firebaseUser) return;
    await markAllAsRead(firebaseUser.uid);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        {hasUnread ? (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            accessibilityRole="button"
            accessibilityLabel="알림 모두 읽음으로 표시"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.markAllRead}>모두 읽음</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.notificationId}
          renderItem={({ item }) => <NotificationItem notification={item} />}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={load} tintColor="#4A90E2" />
          }
          ListEmptyComponent={<EmptyNotifications />}
        />
      )}
    </View>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <View style={[styles.item, !notification.isRead && styles.itemUnread]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{TYPE_ICON[notification.type]}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.typeLabel}>{TYPE_LABEL[notification.type]}</Text>
        <Text style={styles.date}>
          {dayjs(notification.createdAt.toDate()).format('MM.DD HH:mm')}
        </Text>
      </View>
      {!notification.isRead && <View style={styles.unreadDot} />}
    </View>
  );
}

function EmptyNotifications() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>아직 알림이 없어요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  markAllRead: { fontSize: 14, color: '#4A90E2' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemUnread: { backgroundColor: '#F0F7FF' },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF2FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 18 },
  itemContent: { flex: 1 },
  typeLabel: { fontSize: 15, color: '#212121', fontWeight: '500' },
  date: { fontSize: 12, color: '#767676', marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginLeft: 8,
  },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  emptyText: { fontSize: 16, color: '#767676' },
});

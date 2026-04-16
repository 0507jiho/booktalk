import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';
import app from '@/services/firebase/config';

let analytics: ReturnType<typeof getAnalytics> | null = null;

isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {
  // Analytics not supported in this environment (e.g., Expo Go, emulator)
});

function log(eventName: string, params?: Record<string, string | number | boolean>) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch {
    // Silently ignore analytics errors
  }
}

export const Analytics = {
  signUp: () => log('sign_up'),
  onboardingComplete: () => log('onboarding_complete'),
  firstContribution: (type: 'review' | 'topic' | 'answer') =>
    log('first_contribution', { type }),
  reviewCreated: (bookId: string) => log('review_created', { bookId }),
  topicCreated: (type: string) => log('topic_created', { type }),
  answerCreated: (side: string) => log('answer_created', { side }),
  replyCreated: () => log('reply_created'),
};

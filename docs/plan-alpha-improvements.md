# BookTalk 개선 구현 계획 (알파 출시 전)

> **상태**: ✅ 대부분 완료 (2026-04-09)
> **작성 배경**: 에이전트 팀(UX 분석, 기능 비판, UI 개선) 3개의 병렬 분석 결과를 종합한 우선순위 기반 구현 계획.
> 현재 앱은 기능은 작동하지만 "왜 이 앱을 써야 하는가"의 훅이 없는 상태. NSM(주당 기여 수) 달성을 가로막는
> 블로커 5개를 먼저 제거하고, 이후 알파 단계 UX 개선을 진행한다.

---

## Phase 1: 블로커 제거 (알파 출시 전 필수)

### ✅ B4. 접근성 P0 수정
**파일:** 전체 src/screens/**/*.tsx, `src/theme/colors.ts`

**완료 내용:**
1. `src/theme/colors.ts` 생성 — WCAG AA 기준 컬러 토큰 중앙화 (다크모드 구조 포함)
2. `#9E9E9E` → `#767676` 전역 치환 (13개 화면, 대비 4.54:1 AA 통과)
3. 작은 터치 요소에 `hitSlop` 추가 (sideBtn 40→48dp)
4. 주요 TouchableOpacity에 `accessibilityRole="button"` + `accessibilityLabel` 추가

---

### ✅ B2. NSM 이벤트 트래킹
**완료 내용:**
- `src/services/analytics.ts` 생성 — Firebase Analytics 래퍼 (isSupported() 안전 처리)
- `createReview()`, `createTopic()`, `addAnswer()`, `addReply()` — 기여 이벤트 삽입
- `SignUpScreen` — 가입 성공 시 `Analytics.signUp()` 호출

---

### ✅ B5. 앱스토어 필수 기능 (신고/차단/탈퇴/생년월일)
**완료 내용:**
- `SignUpScreen` — birthDate 텍스트 입력 (YYYY-MM-DD), 만 14세 미만 가입 차단
- `src/services/firebase/reports.ts` — `createReport()`, `createBlock()`
- `src/components/ReportModal.tsx` — 신고 사유 선택 바텀시트 모달
- `UserProfileScreen` — 차단 버튼 (본인 프로필 제외, 차단 상태 UI 반영)
- `ProfileScreen` — 계정 탈퇴 버튼 (Firestore 익명화 + Firebase Auth 삭제)
- `src/types/index.ts` — `Report`, `Block` 타입 추가

---

### ✅ B3. Cold Start 해결 + 기본 온보딩
**완료 내용:**
- `WelcomeScreen.tsx` — 앱 소개 (기능 3가지)
- `GenreSelectScreen.tsx` — 관심 장르 선택 (AsyncStorage 저장)
- `OnboardingNavigator.tsx` — 온보딩 스택
- `RootNavigator.tsx` — 로그인 후 `onboarding_done` 체크 → 온보딩 또는 메인
- `authStore.ts` — `onboardingDone` 상태 추가
- `HomeScreen.tsx` — 피드 비어있으면 `fetchTrendingTopics()` 호출 → "지금 뜨는 발제" 표시
- `topics.ts` — `fetchTrendingTopics()` 추가 (answerCount 내림차순)

---

### ⏳ B1. 알라딘 API Cloud Functions 프록시
**전제 조건:** Firebase 프로젝트가 Blaze(종량제) 플랜이어야 함

**계획:**
```typescript
// functions/src/aladin.ts (신규)
import { onCall } from 'firebase-functions/v2/https';
export const searchBooks = onCall(async (request) => {
  const { query, start = 1 } = request.data;
  const apiKey = process.env.ALADIN_API_KEY;
  // ... fetch 로직
});

// src/services/aladin/client.ts 수정
import { getFunctions, httpsCallable } from 'firebase/functions';
const functions = getFunctions();
const searchBooksCallable = httpsCallable(functions, 'searchBooks');
```

**수정/신규 파일:**
- `functions/src/aladin.ts` (신규)
- `functions/package.json` (신규)
- `src/services/aladin/client.ts` — httpsCallable로 교체
- `.env` — `EXPO_PUBLIC_ALADIN_API_KEY` 제거

---

## Phase 2: 알파 단계 UX 개선

### ✅ A4. 찬반발제 차별화 UI
**완료 내용:**
- `src/components/StanceProgressBar.tsx` — 찬반 비율 바 (일반 + 미니 variant)
- `TopicDetailScreen` — agree-disagree 발제 상세에 비율 바 표시, neutral 옵션 제거
- `TopicListScreen` — 찬반발제 카드에 미니 비율 바 (proCount/conCount 있을 때)
- `types/index.ts` — `Topic.proCount?`, `Topic.conCount?` 필드 추가

---

### ✅ A6. Skeleton Loader + 빈 상태 개선
**완료 내용:**
- `src/components/SkeletonCard.tsx` — shimmer 애니메이션 (Animated.Value, 외부 패키지 불필요)
- `src/components/EmptyState.tsx` — 이모지 아이콘 + 메시지 + CTA 버튼
- `HomeScreen`, `TopicListScreen`, `ClubListScreen` — SkeletonCard로 로딩 교체
- `TopicListScreen`, `ClubListScreen` — EmptyState CTA 적용
- `AddAnswerModal`, `CreateClubModal` — 드래그 핸들 추가

---

### ✅ A3. UserBook 상태 UI
> 이미 이전 세션에서 구현 완료 (BookDetailScreen + ProfileScreen 책장 탭)

---

### ✅ A1. 컬러 시스템 완성
**완료 내용:**
- `src/theme/colors.ts` — dark 토큰 완성
- `src/theme/index.ts` — `ThemeProvider` + `useTheme()` 훅 (시스템 다크모드 자동 감지)
- `App.tsx` — `ThemeProvider` 감싸기

---

### ✅ A2. 탭 구조 조정
**완료 내용:**
- `MainTabNavigator.tsx` — Notification 탭 제거, Book 탭 추가 (홈/발제/책/모임/프로필)
- `BookStackNavigator.tsx` — BookSearch → BookDetail 스택 신규 생성
- `HomeStackNavigator.tsx` — 홈 헤더에 알림 벨 아이콘 추가, Notification 스크린 스택 편입

---

## 구현 완료 후 마이그레이션

> `node scripts/migrate.js` 실행 (Firebase Admin SDK 필요)

| Step | 작업 | 상태 |
|------|------|------|
| 1 | `users` — `birthDate` 기본값 `'2000-01-01'` 추가 | 스크립트 준비됨 |
| 2 | `topics` — `proCount`/`conCount` 집계 채우기 | 스크립트 준비됨 |
| 3 | agree-disagree 발제의 `neutral` 답변 → `con` 변경 | 스크립트 준비됨 |
| 4 | 기존 리뷰 → `userBooks` 생성 (status: 'read') | 스크립트 준비됨 |

### 수동 확인 체크리스트

- [ ] 기존 테스트 계정으로 로그인 → 온보딩 스킵(이미 완료로 처리) 확인
- [ ] 기존 찬반발제 상세 화면 → 프로그레스 바 정상 표시
- [ ] ProfileScreen 책장 탭 → 기존 리뷰 작성 책이 'read' 상태로 노출
- [ ] 기존 neutral 답변이 agree-disagree 발제에 남아있지 않음
- [ ] 신규 가입 플로우 → 온보딩 → 메인 탭 진입 정상 동작
- [ ] 다크모드 전환 시 ThemeProvider 색상 반영 확인

---

## 새로 추가된 파일 목록

```
src/
├── theme/
│   ├── colors.ts              # 컬러 토큰 (WCAG AA, 다크모드)
│   └── index.ts               # ThemeContext + useTheme 훅
├── components/
│   ├── SkeletonCard.tsx       # shimmer 로딩
│   ├── EmptyState.tsx         # 빈 상태 (아이콘 + CTA)
│   ├── StanceProgressBar.tsx  # 찬반 비율 바
│   └── ReportModal.tsx        # 신고 모달
├── screens/
│   └── onboarding/
│       ├── WelcomeScreen.tsx
│       └── GenreSelectScreen.tsx
├── navigation/
│   ├── OnboardingNavigator.tsx
│   └── BookStackNavigator.tsx
└── services/
    ├── analytics.ts
    └── firebase/
        └── reports.ts

scripts/
└── migrate.js                 # Firestore 마이그레이션 (1회 실행)
```

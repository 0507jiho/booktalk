# BookTalk

개인 독서자와 독서모임 구성원이 책을 중심으로 리뷰·발제·토론을 이어가는 커뮤니티 앱.

- **플랫폼**: iOS / Android (추후 Web 대응)
- **북극성 지표(NSM)**: 사용자당 주당 발제·리뷰·답변 기여 수

## 문제 정의

| 문제 | 해결 방향 |
|------|-----------|
| 오프라인 독서모임은 지속성이 낮고 회차 간 맥락이 단절된다 | 발제·답변 기록을 온라인에서 영구 보존해 맥락을 이어줌 |
| 책에 대한 리뷰·토론을 이어갈 전용 온라인 공간이 부족하다 | 책 중심 소셜 피드 + 발제 탭으로 토론 공간 제공 |
| 모임 운영자가 발제·일정·참여자를 체계적으로 관리하기 어렵다 | 모임 탭에서 일정/참여자/발제 일괄 관리 |

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | React Native + Expo ~54.0.0 |
| 언어 | TypeScript (strict) |
| 인증/DB/푸시 | Firebase Auth + Firestore + FCM + Storage |
| 상태관리 | Zustand ^5 |
| 네비게이션 | React Navigation 6 (bottom-tabs + native-stack) |
| 도서 검색 | 알라딘 Open API |
| 날짜 | dayjs |
| 푸시 알림 | expo-notifications (FCM 연동) |
| CI/CD | GitHub Actions + EAS Build (Expo) |

## 시작하기

### 사전 요구사항

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Firebase 프로젝트

### 설치

```bash
git clone https://github.com/<your-username>/booktalk.git
cd booktalk
npm install
```

### 환경변수 설정

`.env.example`을 복사해 `.env`를 만들고 값을 채워주세요.

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_ALADIN_API_KEY=
```

Android FCM을 사용하려면 Firebase 콘솔에서 `google-services.json`을 발급받아 프로젝트 루트에 추가하세요.

### 개발 서버 실행

```bash
npm start          # Expo 개발 서버
npm run android    # Android 에뮬레이터
npm run ios        # iOS 시뮬레이터
```

### 기타 명령어

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run format     # Prettier
```

## 디렉토리 구조

```
booktalk/
├── App.tsx                     # 앱 진입점 (NavigationContainer + RootNavigator)
├── functions/                  # Firebase Cloud Functions
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx   # 인증 분기
│   │   ├── AuthNavigator.tsx   # 로그인/회원가입 스택
│   │   └── MainTabNavigator.tsx # 하단 탭 5개
│   ├── screens/
│   │   ├── auth/               # LoginScreen, SignUpScreen
│   │   ├── home/               # HomeScreen (팔로잉 피드)
│   │   ├── topic/              # TopicListScreen, TopicDetailScreen
│   │   ├── club/               # ClubListScreen, ClubDetailScreen
│   │   ├── notification/       # NotificationScreen
│   │   └── profile/            # ProfileScreen
│   ├── services/
│   │   ├── firebase/config.ts  # auth, db 인스턴스 export
│   │   └── aladin/client.ts    # searchBooks, getBookByIsbn
│   ├── stores/                 # Zustand 스토어
│   │   ├── authStore.ts        # firebaseUser, userProfile
│   │   ├── clubStore.ts        # myClubs, events, memberships
│   │   └── feedStore.ts        # 홈 피드 데이터
│   └── types/index.ts          # 모든 도메인 타입 정의
```

경로 alias: `@/` → `src/`

## 도메인 모델

- **User** — uid, displayName, bio, photoURL, followersCount, followingCount, badgeIds
- **Book** — bookId, title, author, publisher, coverUrl, isbn, avgRating, reviewCount
- **Review** — bookId, userId, rating(1-5), content, likeCount
- **Topic** — bookId, userId, type(`free`|`agree-disagree`), title, body, answerCount, clubId?
- **Answer** — topicId, userId, side(`pro`|`con`|`neutral`), content, likeCount
- **Reply** — answerId, userId, content, likeCount
- **Club** — name, description, ownerId, memberCount, isPrivate
- **Event** — clubId, title, date, location, topicId?, attendees[]
- **Membership** — clubId, uid, role(`owner`|`member`), status(`active`|`pending`)
- **Notification** — type(`like`|`answer`|`follow`|`club_invite`|`event_reminder`), isRead

## 기능 범위 (MoSCoW)

- **Must**: 리뷰 작성/조회/좋아요, 자유발제+찬반발제 생성/답변/답글, 팔로우, 모임 생성·일정·참여자 관리, 책 검색(알라딘 API), 알림, 뱃지
- **Should**: 리뷰/발제 공유, 모임 공지 알림, 기본 활동 통계
- **Could**: 모임 전용 캘린더 뷰, 사용자·발제 추천, 북마크
- **Won't(v1)**: 유료 구독, 음성/화상 토론, 대댓글 스레드

## 릴리즈 로드맵

| 단계 | 기간 | 목표 |
|------|------|------|
| 알파 | M1~2 | 인증 + 팔로우 + 리뷰/발제 + 홈 피드 확인 |
| 베타 | M3 | 모임 생성/일정/참여자 관리 + 알림 검증, 초대 50명 화이트 레이블 운영 |
| 퍼블릭 | M4~ | NSM 목표치 달성 후 앱스토어/플레이스토어 정식 제출 |

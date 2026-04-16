/**
 * BookTalk 컬러 토큰
 * WCAG 2.1 AA 기준을 충족하는 색상 시스템
 */

export const Colors = {
  light: {
    // Primary
    primary: '#3D4DC4',
    primaryLight: '#ECEFFE',
    primaryDisabled: '#9BA5E0',

    // Status / Sentiment
    pro: '#27AE60',       // 찬성
    proLight: '#E9F7EF',
    con: '#E74C3C',       // 반대
    conLight: '#FDECEA',
    neutral: '#7F8C8D',   // 중립
    agree: '#E67E22',     // 찬반발제 배지
    agreeLight: '#FEF0E7',
    answer: '#8E44AD',    // 답변 배지
    answerLight: '#F5EEF8',
    rating: '#F5A623',    // 별점

    // Text — WCAG AA 준수
    textPrimary: '#212121',
    textSecondary: '#424242',
    textBody: '#616161',
    textMuted: '#767676',    // ✅ #9E9E9E → #767676 (대비 4.54:1, AA 통과)
    textPlaceholder: '#BDBDBD',

    // Backgrounds
    surface: '#F7F8FF',
    card: '#ffffff',
    inputBorder: '#E0E0E0',

    // Borders / Dividers
    border: '#F0F0F0',
    divider: '#F5F5F5',
  },
  dark: {
    primary: '#7B86D4',
    primaryLight: '#1E2040',
    primaryDisabled: '#3A3F6A',

    pro: '#2A7A4F',
    proLight: '#1A2E22',
    con: '#C0392B',
    conLight: '#2E1A1A',
    neutral: '#6B7280',
    agree: '#C17F3A',
    agreeLight: '#2E2216',
    answer: '#7B5EA7',
    answerLight: '#211A2E',
    rating: '#D4A057',

    textPrimary: '#F0ECE4',
    textSecondary: '#C0BAB0',
    textBody: '#A0A0A0',
    textMuted: '#888888',
    textPlaceholder: '#555555',

    surface: '#0F1020',
    card: '#1E1E1E',
    inputBorder: '#2A2A2A',

    border: '#2A2A2A',
    divider: '#262626',
  },
};

export type ColorScheme = {
  primary: string; primaryLight: string; primaryDisabled: string;
  pro: string; proLight: string; con: string; conLight: string;
  neutral: string; agree: string; agreeLight: string;
  answer: string; answerLight: string; rating: string;
  textPrimary: string; textSecondary: string; textBody: string;
  textMuted: string; textPlaceholder: string;
  surface: string; card: string; inputBorder: string;
  border: string; divider: string;
};

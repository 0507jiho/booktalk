import { useRef } from 'react';
import { Animated } from 'react-native';

const OPEN_DURATION = { overlay: 220, sheet: 280 } as const;
const CLOSE_DURATION = { overlay: 180, sheet: 220 } as const;

export function useBottomSheet(sheetHeight: number) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(sheetHeight)).current;

  function animateOpen() {
    overlayOpacity.setValue(0);
    sheetTranslateY.setValue(sheetHeight);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: OPEN_DURATION.overlay, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 0, duration: OPEN_DURATION.sheet, useNativeDriver: true }),
    ]).start();
  }

  function animateClose(callback: () => void) {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: CLOSE_DURATION.overlay, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: sheetHeight, duration: CLOSE_DURATION.sheet, useNativeDriver: true }),
    ]).start(() => callback());
  }

  function reset() {
    overlayOpacity.setValue(0);
    sheetTranslateY.setValue(sheetHeight);
  }

  return { overlayOpacity, sheetTranslateY, animateOpen, animateClose, reset };
}

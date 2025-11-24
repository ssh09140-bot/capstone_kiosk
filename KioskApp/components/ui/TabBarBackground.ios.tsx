import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur'; // Replaced from 'expo-blur'
import { StyleSheet } from 'react-native';

export default function BlurTabBarBackground() {
  return (
    <BlurView
      // 'systemChromeMaterial' is Expo-specific. Using a default blur type for now.
      // You might need to adjust blurType and reducedTransparencyFallbackColor for desired effect.
      blurType="light" // Can be 'dark', 'light', 'xlight', etc. based on platform
      blurAmount={10} // Adjust as needed
      style={StyleSheet.absoluteFill}
      reducedTransparencyFallbackColor="white" // Fallback for platforms not supporting blur
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}

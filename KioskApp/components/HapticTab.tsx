import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable, Platform } from 'react-native'; // Use Pressable from react-native
import HapticFeedback from 'react-native-haptic-feedback';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <Pressable // Replaced PlatformPressable with Pressable
      {...props}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') { // Replaced process.env.EXPO_OS with Platform.OS
          // Add a soft haptic feedback when pressing down on the tabs.
          // Optional: Configure HapticFeedback options if needed
          HapticFeedback.trigger('impactLight', {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
          });
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

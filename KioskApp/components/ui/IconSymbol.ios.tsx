import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; // Using MaterialCommunityIcons as a placeholder
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name, // This name will need to be mapped to a MaterialCommunityIcons name
  size = 24,
  color,
  style,
  weight = 'regular', // Not used for react-native-vector-icons
}: {
  name: string; // Changed type to string
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: string; // Changed type to string
}) {
  // A basic mapping or a direct icon name can be used here.
  // For now, I'll just assume `name` corresponds to a MaterialCommunityIcons name.
  // You might need to adjust the actual icon names based on what SF Symbol maps to what Material Community Icon.
  return (
    <MaterialCommunityIcons
      name={name} // This will likely need a mapping
      size={size}
      color={color}
      style={style}
    />
  );
}

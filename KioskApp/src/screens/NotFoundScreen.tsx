import { StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack'; // For Stack.Screen options
import { useNavigation } from '@react-navigation/native'; // For Link replacement

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react'; // Added React import

type NotFoundScreenProps = StackScreenProps<any, 'NotFound'>; // Define props for the screen

export default function NotFoundScreen({ navigation }: NotFoundScreenProps) {
  const nav = useNavigation(); // Get navigation object

  React.useLayoutEffect(() => { // Equivalent to Stack.Screen options
    nav.setOptions({ title: 'Oops!' });
  }, [nav]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">This screen does not exist.</ThemedText>
      <ThemedText type="link" style={styles.link} onPress={() => nav.navigate('Home')}> {/* Replaced Link with ThemedText and onPress */}
        Go to home screen!
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
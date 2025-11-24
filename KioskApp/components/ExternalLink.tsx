import { type ComponentProps } from 'react';
import { Linking, Platform, Text, TouchableOpacity } from 'react-native';

type Props = ComponentProps<typeof Text> & { href: string }; // Simplified props

export function ExternalLink({ href, style, ...rest }: Props) {
  return (
    <TouchableOpacity
      onPress={async () => {
        // Open the link in an external browser.
        await Linking.openURL(href);
      }}>
      <Text style={style} {...rest} />
    </TouchableOpacity>
  );
}
